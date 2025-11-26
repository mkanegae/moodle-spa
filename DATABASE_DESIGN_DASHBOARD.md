# 学習ダッシュボード データベース設計

## 目次

1. [概要](#概要)
2. [必要なテーブル一覧](#必要なテーブル一覧)
3. [テーブル詳細設計](#テーブル詳細設計)
4. [ER図](#er図)
5. [サンプルクエリ](#サンプルクエリ)
6. [Moodle既存テーブルとの連携](#moodle既存テーブルとの連携)

---

## 概要

### 機能要件

- **ロードマップ全体の進捗率**を表示
- **完了したタスク**の一覧表示
- **次のタスク**の提示
- **学習計画**の管理
- **学習目標**の設定と進捗追跡

### データ取得元

| データ | 取得元 |
|--------|--------|
| コース一覧 | Moodle DB (`mdl_course`) |
| コース登録状況 | Moodle DB (`mdl_user_enrolments`) |
| コース完了状況 | Moodle DB (`mdl_course_completions`) |
| アクティビティ完了状況 | Moodle DB (`mdl_course_modules_completion`) |
| ロードマップ定義 | **新規テーブル** |
| 学習目標・計画 | **新規テーブル** |
| 詳細進捗データ | **新規テーブル** |

---

## 必要なテーブル一覧

### 新規作成テーブル（PostgreSQL）

| テーブル名 | 役割 |
|-----------|------|
| `learning_roadmaps` | ロードマップ定義（全体の学習経路） |
| `roadmap_steps` | ロードマップのステップ詳細 |
| `user_roadmaps` | ユーザーとロードマップの紐付け |
| `user_learning_goals` | ユーザーの学習目標 |
| `user_learning_plans` | ユーザーの学習計画（スケジュール） |
| `user_task_progress` | ユーザーのタスク進捗詳細 |
| `learning_milestones` | マイルストーン定義 |

---

## テーブル詳細設計

### 1. learning_roadmaps（ロードマップ定義）

**目的:** 学習経路の全体像を定義する（例: 「Webデザイナー育成コース」）

```sql
CREATE TABLE learning_roadmaps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,                    -- ロードマップ名
    description TEXT,                              -- 説明
    category VARCHAR(100),                         -- カテゴリ (design/video/programming)
    estimated_duration_hours INTEGER,              -- 想定学習時間（時間）
    difficulty_level VARCHAR(50),                  -- 難易度 (beginner/intermediate/advanced)
    icon_url VARCHAR(500),                         -- アイコン画像URL
    is_public BOOLEAN DEFAULT TRUE,                -- 公開/非公開
    display_order INTEGER DEFAULT 0,               -- 表示順序
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_roadmaps_category ON learning_roadmaps(category);
CREATE INDEX idx_roadmaps_public ON learning_roadmaps(is_public);

-- サンプルデータ
INSERT INTO learning_roadmaps (name, description, category, estimated_duration_hours, difficulty_level) VALUES
('Webデザイナー育成コース', 'ゼロからWebデザイナーを目指す総合コース', 'design', 120, 'beginner'),
('UI/UXデザイン実践', 'UI/UXの基礎から実践まで', 'design', 80, 'intermediate'),
('動画編集マスター', '動画編集の基礎から応用まで', 'video', 100, 'beginner');
```

---

### 2. roadmap_steps（ロードマップステップ）

**目的:** ロードマップを構成する各ステップ（コースやタスク）を定義

```sql
CREATE TABLE roadmap_steps (
    id SERIAL PRIMARY KEY,
    roadmap_id INTEGER NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,                  -- ステップ番号（順序）
    step_type VARCHAR(50) NOT NULL,                -- タイプ (course/activity/milestone/custom)

    -- Moodleリソース参照
    moodle_course_id INTEGER,                      -- Moodleコースを参照する場合
    moodle_activity_id INTEGER,                    -- Moodleアクティビティを参照する場合

    -- カスタムタスク情報
    title VARCHAR(200) NOT NULL,                   -- ステップ名
    description TEXT,                              -- ステップ説明
    estimated_hours INTEGER,                       -- 想定学習時間

    -- 前提条件
    prerequisite_step_ids INTEGER[],               -- 前提となるステップID配列
    is_optional BOOLEAN DEFAULT FALSE,             -- 任意ステップか

    -- リソース
    resources JSONB,                               -- 参考資料（URL等）

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(roadmap_id, step_number)
);

-- インデックス
CREATE INDEX idx_steps_roadmap ON roadmap_steps(roadmap_id);
CREATE INDEX idx_steps_course ON roadmap_steps(moodle_course_id);
CREATE INDEX idx_steps_number ON roadmap_steps(roadmap_id, step_number);

-- サンプルデータ
INSERT INTO roadmap_steps (roadmap_id, step_number, step_type, moodle_course_id, title, description, estimated_hours) VALUES
(1, 1, 'course', 10, 'デザイン基礎理論', 'デザインの基本原則を学ぶ', 10),
(1, 2, 'course', 11, 'Figma入門', 'Figmaの基本操作を習得', 8),
(1, 3, 'activity', 12, '実践課題：LPデザイン', '学んだ知識を活かしてランディングページを制作', 15),
(1, 4, 'milestone', NULL, 'ポートフォリオ作成', '制作物をまとめたポートフォリオを作成', 20);
```

---

### 3. user_roadmaps（ユーザーのロードマップ登録）

**目的:** どのユーザーがどのロードマップを学習中かを管理

```sql
CREATE TABLE user_roadmaps (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,               -- MoodleユーザーID
    roadmap_id INTEGER NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,

    -- 進捗状況
    status VARCHAR(50) DEFAULT 'in_progress',      -- in_progress/completed/paused
    started_at TIMESTAMP DEFAULT NOW(),            -- 開始日時
    completed_at TIMESTAMP,                        -- 完了日時

    -- 進捗率（自動計算）
    total_steps INTEGER NOT NULL DEFAULT 0,        -- 総ステップ数
    completed_steps INTEGER NOT NULL DEFAULT 0,    -- 完了ステップ数
    progress_percentage INTEGER GENERATED ALWAYS AS
        (CASE WHEN total_steps > 0 THEN (completed_steps * 100 / total_steps) ELSE 0 END) STORED,

    -- 次のステップ
    current_step_id INTEGER REFERENCES roadmap_steps(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(moodle_user_id, roadmap_id)
);

-- インデックス
CREATE INDEX idx_user_roadmaps_user ON user_roadmaps(moodle_user_id);
CREATE INDEX idx_user_roadmaps_status ON user_roadmaps(status);
CREATE INDEX idx_user_roadmaps_progress ON user_roadmaps(progress_percentage);
```

---

### 4. user_learning_goals（学習目標）

**目的:** ユーザーが設定した学習目標を管理

```sql
CREATE TABLE user_learning_goals (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,               -- ユーザーID
    roadmap_id INTEGER REFERENCES learning_roadmaps(id) ON DELETE SET NULL,

    -- 目標内容
    goal_title VARCHAR(200) NOT NULL,              -- 目標タイトル
    goal_description TEXT,                         -- 目標詳細
    goal_type VARCHAR(50),                         -- 目標タイプ (skill/certification/project/career)

    -- 期限
    target_date DATE,                              -- 目標達成予定日

    -- 進捗
    status VARCHAR(50) DEFAULT 'active',           -- active/achieved/abandoned
    progress_percentage INTEGER DEFAULT 0,         -- 進捗率
    achieved_at TIMESTAMP,                         -- 達成日時

    -- メモ
    notes TEXT,                                    -- メモ

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_goals_user ON user_learning_goals(moodle_user_id);
CREATE INDEX idx_goals_status ON user_learning_goals(status);
CREATE INDEX idx_goals_target ON user_learning_goals(target_date);

-- サンプルデータ
INSERT INTO user_learning_goals (moodle_user_id, roadmap_id, goal_title, goal_type, target_date) VALUES
(123, 1, 'Webデザイナーとしてフリーランスデビュー', 'career', '2025-12-31'),
(123, 1, 'ポートフォリオサイト3作品完成', 'project', '2025-09-30');
```

---

### 5. user_learning_plans（学習計画）

**目的:** ユーザーの週次/月次の学習計画を管理

```sql
CREATE TABLE user_learning_plans (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,
    roadmap_id INTEGER REFERENCES learning_roadmaps(id) ON DELETE SET NULL,

    -- 計画期間
    plan_type VARCHAR(50) NOT NULL,                -- weekly/monthly/custom
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- 計画内容
    target_hours INTEGER,                          -- 目標学習時間
    target_steps INTEGER,                          -- 目標完了ステップ数

    -- 実績
    actual_hours INTEGER DEFAULT 0,                -- 実績学習時間
    actual_steps INTEGER DEFAULT 0,                -- 実績完了ステップ数

    -- 達成率
    achievement_rate INTEGER GENERATED ALWAYS AS
        (CASE WHEN target_hours > 0 THEN (actual_hours * 100 / target_hours) ELSE 0 END) STORED,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_plans_user ON user_learning_plans(moodle_user_id);
CREATE INDEX idx_plans_period ON user_learning_plans(start_date, end_date);
```

---

### 6. user_task_progress（タスク進捗詳細）

**目的:** ロードマップの各ステップの詳細な進捗を記録

```sql
CREATE TABLE user_task_progress (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,
    roadmap_step_id INTEGER NOT NULL REFERENCES roadmap_steps(id) ON DELETE CASCADE,

    -- 進捗状況
    status VARCHAR(50) DEFAULT 'not_started',      -- not_started/in_progress/completed/skipped

    started_at TIMESTAMP,                          -- 開始日時
    completed_at TIMESTAMP,                        -- 完了日時

    -- 学習時間
    time_spent_minutes INTEGER DEFAULT 0,         -- 学習時間（分）

    -- 評価
    self_rating INTEGER,                           -- 自己評価 (1-5)
    notes TEXT,                                    -- メモ

    -- Moodle連携
    moodle_completion_status VARCHAR(50),          -- Moodleからの完了ステータス
    last_synced_at TIMESTAMP,                      -- 最終同期日時

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(moodle_user_id, roadmap_step_id)
);

-- インデックス
CREATE INDEX idx_task_progress_user ON user_task_progress(moodle_user_id);
CREATE INDEX idx_task_progress_step ON user_task_progress(roadmap_step_id);
CREATE INDEX idx_task_progress_status ON user_task_progress(status);
CREATE INDEX idx_task_progress_completed ON user_task_progress(completed_at);
```

---

### 7. learning_milestones（マイルストーン）

**目的:** 重要な節目や達成すべきマイルストーンを定義

```sql
CREATE TABLE learning_milestones (
    id SERIAL PRIMARY KEY,
    roadmap_id INTEGER NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
    milestone_number INTEGER NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),                              -- アイコン（絵文字など）

    -- 達成条件
    required_step_ids INTEGER[],                   -- 必要なステップID配列

    -- 報酬・バッジ
    badge_name VARCHAR(100),
    badge_icon_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(roadmap_id, milestone_number)
);

-- インデックス
CREATE INDEX idx_milestones_roadmap ON learning_milestones(roadmap_id);

-- サンプルデータ
INSERT INTO learning_milestones (roadmap_id, milestone_number, title, description, icon, badge_name) VALUES
(1, 1, '基礎知識習得完了', 'デザインの基礎理論とツールの使い方を習得しました！', '📚', '基礎マスター'),
(1, 2, '実践課題クリア', '実際の制作課題を完了しました！', '🎨', '実践者'),
(1, 3, 'ポートフォリオ完成', 'あなたのポートフォリオが完成しました！', '🏆', 'ポートフォリオマスター');
```

---

## ER図

```
┌─────────────────────┐
│ learning_roadmaps   │  ロードマップ定義
│ - id (PK)           │
│ - name              │
│ - category          │
│ - duration          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐
│ roadmap_steps       │  ステップ詳細
│ - id (PK)           │
│ - roadmap_id (FK)   │
│ - step_number       │
│ - moodle_course_id  │ ← Moodle連携
│ - title             │
└──────────┬──────────┘
           │
    ┌──────┴────────┬─────────────┐
    │ 1             │ 1           │
    │               │             │
    │ N             │ N           │ N
┌───▼────────────┐ ┌▼──────────┐ ┌▼─────────────────┐
│user_roadmaps   │ │user_task  │ │learning_milestones│
│- user_id       │ │_progress  │ │- milestone_number │
│- roadmap_id(FK)│ │- user_id  │ │- required_steps   │
│- progress_%    │ │- step_id  │ │- badge            │
└────────────────┘ │- status   │ └──────────────────┘
                   │- completed│
                   └───────────┘

┌─────────────────────┐        ┌──────────────────────┐
│user_learning_goals  │        │user_learning_plans   │
│- user_id            │        │- user_id             │
│- roadmap_id (FK)    │        │- roadmap_id (FK)     │
│- goal_title         │        │- start_date          │
│- target_date        │        │- target_hours        │
│- progress_%         │        │- actual_hours        │
└─────────────────────┘        └──────────────────────┘
```

---

## サンプルクエリ

### 1. ユーザーのダッシュボードデータ取得

```sql
-- ユーザーID: 123のダッシュボード情報を取得
SELECT
    ur.roadmap_id,
    lr.name AS roadmap_name,
    lr.category,
    ur.progress_percentage,
    ur.total_steps,
    ur.completed_steps,
    ur.status,
    rs_current.title AS current_step_title,
    rs_current.description AS current_step_description,
    rs_current.estimated_hours AS current_step_hours
FROM user_roadmaps ur
JOIN learning_roadmaps lr ON ur.roadmap_id = lr.id
LEFT JOIN roadmap_steps rs_current ON ur.current_step_id = rs_current.id
WHERE ur.moodle_user_id = 123
  AND ur.status = 'in_progress'
ORDER BY ur.progress_percentage DESC;
```

### 2. 完了したタスク一覧

```sql
-- ユーザーID: 123の完了タスク（最近30日間）
SELECT
    rs.title AS task_title,
    rs.step_type,
    utp.completed_at,
    utp.time_spent_minutes,
    utp.self_rating,
    lr.name AS roadmap_name
FROM user_task_progress utp
JOIN roadmap_steps rs ON utp.roadmap_step_id = rs.id
JOIN learning_roadmaps lr ON rs.roadmap_id = lr.id
WHERE utp.moodle_user_id = 123
  AND utp.status = 'completed'
  AND utp.completed_at >= NOW() - INTERVAL '30 days'
ORDER BY utp.completed_at DESC;
```

### 3. 次に取り組むべきタスク（推奨）

```sql
-- ユーザーID: 123の次のタスク候補
WITH user_completed_steps AS (
    SELECT roadmap_step_id
    FROM user_task_progress
    WHERE moodle_user_id = 123 AND status = 'completed'
),
user_active_roadmaps AS (
    SELECT roadmap_id
    FROM user_roadmaps
    WHERE moodle_user_id = 123 AND status = 'in_progress'
)
SELECT
    rs.id AS step_id,
    rs.title,
    rs.description,
    rs.estimated_hours,
    rs.step_number,
    lr.name AS roadmap_name,
    -- 前提条件チェック
    CASE
        WHEN rs.prerequisite_step_ids IS NULL THEN TRUE
        WHEN rs.prerequisite_step_ids <@ ARRAY(SELECT roadmap_step_id FROM user_completed_steps) THEN TRUE
        ELSE FALSE
    END AS prerequisites_met
FROM roadmap_steps rs
JOIN learning_roadmaps lr ON rs.roadmap_id = lr.id
WHERE rs.roadmap_id IN (SELECT roadmap_id FROM user_active_roadmaps)
  AND rs.id NOT IN (SELECT roadmap_step_id FROM user_completed_steps)
  AND (rs.prerequisite_step_ids IS NULL
       OR rs.prerequisite_step_ids <@ ARRAY(SELECT roadmap_step_id FROM user_completed_steps))
ORDER BY lr.id, rs.step_number
LIMIT 5;
```

### 4. ロードマップ全体の進捗計算

```sql
-- ユーザーID: 123の各ロードマップ進捗を計算
SELECT
    lr.id AS roadmap_id,
    lr.name AS roadmap_name,
    COUNT(rs.id) AS total_steps,
    COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) AS completed_steps,
    ROUND(
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(rs.id), 0) * 100,
        1
    ) AS progress_percentage,
    SUM(COALESCE(utp.time_spent_minutes, 0)) AS total_time_spent_minutes,
    lr.estimated_duration_hours * 60 AS estimated_minutes,
    ROUND(
        SUM(COALESCE(utp.time_spent_minutes, 0))::NUMERIC /
        NULLIF(lr.estimated_duration_hours * 60, 0) * 100,
        1
    ) AS time_progress_percentage
FROM user_roadmaps ur
JOIN learning_roadmaps lr ON ur.roadmap_id = lr.id
LEFT JOIN roadmap_steps rs ON lr.id = rs.roadmap_id
LEFT JOIN user_task_progress utp ON rs.id = utp.roadmap_step_id
    AND utp.moodle_user_id = ur.moodle_user_id
WHERE ur.moodle_user_id = 123
GROUP BY lr.id, lr.name, lr.estimated_duration_hours, ur.progress_percentage
ORDER BY ur.progress_percentage DESC;
```

### 5. 学習目標の達成状況

```sql
-- ユーザーID: 123の学習目標と進捗
SELECT
    ulg.goal_title,
    ulg.goal_type,
    ulg.target_date,
    ulg.progress_percentage,
    ulg.status,
    CASE
        WHEN ulg.target_date < CURRENT_DATE AND ulg.status != 'achieved'
        THEN '期限超過'
        WHEN ulg.target_date - CURRENT_DATE <= 7
        THEN '期限間近'
        ELSE '順調'
    END AS deadline_status,
    lr.name AS related_roadmap
FROM user_learning_goals ulg
LEFT JOIN learning_roadmaps lr ON ulg.roadmap_id = lr.id
WHERE ulg.moodle_user_id = 123
  AND ulg.status = 'active'
ORDER BY ulg.target_date;
```

### 6. 今週の学習計画と実績

```sql
-- ユーザーID: 123の今週の学習計画
SELECT
    ulp.plan_type,
    ulp.start_date,
    ulp.end_date,
    ulp.target_hours,
    ulp.actual_hours,
    ulp.achievement_rate,
    lr.name AS roadmap_name,
    CASE
        WHEN ulp.achievement_rate >= 100 THEN '達成！'
        WHEN ulp.achievement_rate >= 80 THEN '順調'
        WHEN ulp.achievement_rate >= 50 THEN 'あと少し'
        ELSE 'もっと頑張ろう'
    END AS status_message
FROM user_learning_plans ulp
LEFT JOIN learning_roadmaps lr ON ulp.roadmap_id = lr.id
WHERE ulp.moodle_user_id = 123
  AND ulp.start_date <= CURRENT_DATE
  AND ulp.end_date >= CURRENT_DATE
ORDER BY ulp.start_date DESC;
```

### 7. マイルストーン達成状況

```sql
-- ユーザーID: 123のマイルストーン達成状況
WITH user_completed_steps AS (
    SELECT roadmap_step_id
    FROM user_task_progress
    WHERE moodle_user_id = 123 AND status = 'completed'
)
SELECT
    lm.milestone_number,
    lm.title AS milestone_title,
    lm.description,
    lm.badge_name,
    lr.name AS roadmap_name,
    -- 達成済みか判定
    CASE
        WHEN lm.required_step_ids <@ ARRAY(SELECT roadmap_step_id FROM user_completed_steps)
        THEN TRUE
        ELSE FALSE
    END AS is_achieved,
    -- 達成率
    ROUND(
        (SELECT COUNT(*) FROM user_completed_steps
         WHERE roadmap_step_id = ANY(lm.required_step_ids))::NUMERIC /
        NULLIF(array_length(lm.required_step_ids, 1), 0) * 100,
        1
    ) AS achievement_percentage
FROM learning_milestones lm
JOIN learning_roadmaps lr ON lm.roadmap_id = lr.id
JOIN user_roadmaps ur ON lr.id = ur.roadmap_id
WHERE ur.moodle_user_id = 123
ORDER BY lm.roadmap_id, lm.milestone_number;
```

---

## Moodle既存テーブルとの連携

### 参照するMoodleテーブル

#### 1. mdl_course（コース情報）
```sql
-- Moodleコース情報取得
SELECT
    id,
    fullname,
    shortname,
    category,
    visible
FROM mdl_course
WHERE visible = 1;
```

#### 2. mdl_user_enrolments（コース登録）
```sql
-- ユーザーの登録コース
SELECT
    c.id AS course_id,
    c.fullname,
    ue.timecreated AS enrolled_at,
    ue.status
FROM mdl_user_enrolments ue
JOIN mdl_enrol e ON ue.enrolid = e.id
JOIN mdl_course c ON e.courseid = c.id
WHERE ue.userid = 123;
```

#### 3. mdl_course_completions（コース完了）
```sql
-- コース完了状況
SELECT
    courseid,
    timecompleted,
    progress
FROM mdl_course_completions
WHERE userid = 123
  AND timecompleted IS NOT NULL;
```

#### 4. mdl_course_modules_completion（アクティビティ完了）
```sql
-- アクティビティ完了詳細
SELECT
    coursemoduleid,
    completionstate,
    timemodified
FROM mdl_course_modules_completion
WHERE userid = 123
  AND completionstate > 0;
```

### 同期処理の実装例

```javascript
// BFF Server: Moodleとの同期API
async function syncUserProgress(userId) {
  // 1. Moodleからコース完了状況を取得
  const moodleCompletions = await getMoodleCompletions(userId);

  // 2. PostgreSQLのuser_task_progressを更新
  for (const completion of moodleCompletions) {
    await pool.query(`
      UPDATE user_task_progress utp
      SET
        status = 'completed',
        completed_at = $1,
        moodle_completion_status = 'completed',
        last_synced_at = NOW()
      FROM roadmap_steps rs
      WHERE utp.roadmap_step_id = rs.id
        AND utp.moodle_user_id = $2
        AND rs.moodle_course_id = $3
        AND utp.status != 'completed'
    `, [completion.timecompleted, userId, completion.courseid]);
  }

  // 3. user_roadmapsの進捗率を再計算
  await recalculateRoadmapProgress(userId);
}
```

---

## 追加機能の提案

### 1. 学習リマインダー

```sql
-- リマインダーテーブル
CREATE TABLE learning_reminders (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,
    reminder_type VARCHAR(50),  -- daily/weekly/goal_deadline
    scheduled_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP
);
```

### 2. 学習仲間機能

```sql
-- 同じロードマップを学ぶ仲間
CREATE TABLE learning_buddies (
    id SERIAL PRIMARY KEY,
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    roadmap_id INTEGER REFERENCES learning_roadmaps(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## まとめ

### 必須テーブル

1. ✅ `learning_roadmaps` - ロードマップ定義
2. ✅ `roadmap_steps` - ステップ詳細
3. ✅ `user_roadmaps` - ユーザーのロードマップ登録
4. ✅ `user_task_progress` - タスク進捗
5. ✅ `user_learning_goals` - 学習目標
6. ✅ `user_learning_plans` - 学習計画
7. ✅ `learning_milestones` - マイルストーン

### データフロー

```
[Moodle DB]
  ↓ 同期
[PostgreSQL新規テーブル]
  ↓ API
[BFF Server]
  ↓ JSON
[React Frontend]
  ↓ 表示
[ダッシュボード画面]
```

これらのテーブルにより、以下の機能が実現可能です：
- ✅ ロードマップ全体の進捗率表示
- ✅ 完了したタスクの一覧
- ✅ 次に取り組むべきタスクの提示
- ✅ 学習計画の管理
- ✅ 学習目標の追跡
- ✅ マイルストーン達成のゲーミフィケーション
