# 設計方針書

## 目次

1. [全体アーキテクチャ](#全体アーキテクチャ)
2. [技術スタック](#技術スタック)
3. [データベース設計方針](#データベース設計方針)
4. [機能別設計方針](#機能別設計方針)
5. [セキュリティ設計](#セキュリティ設計)
6. [パフォーマンス設計](#パフォーマンス設計)

---

## 全体アーキテクチャ

### システム構成図

```
┌─────────────────┐
│   CloudFront    │  静的コンテンツ配信
│   (CDN)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   S3 Bucket     │  React SPA
│   (Frontend)    │  (Build成果物)
└─────────────────┘

         │ HTTPS
         ▼
┌─────────────────┐
│   BFF Server    │  Node.js/Express
│   (Port: 3001)  │  認証・API集約
└────────┬────────┘
         │
    ┌────┴─────┬─────────────┐
    ▼          ▼             ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ Moodle │ │FastAPI │ │  OpenAI  │
│   DB   │ │ChromaDB│ │   API    │
└────────┘ └────────┘ └──────────┘
```

### レイヤー構成

1. **プレゼンテーション層 (Frontend)**
   - React 18 + TypeScript
   - Material-UI / Tailwind CSS
   - Zustand (状態管理)
   - React Router (ルーティング)

2. **API集約層 (BFF)**
   - Node.js + Express
   - セッション管理
   - 認証・認可
   - Moodle/FastAPI/OpenAI APIの集約

3. **ビジネスロジック層**
   - Moodle (既存LMS)
   - FastAPI (セマンティック検索・カスタムロジック)
   - ChromaDB (ベクトル検索)

4. **データ層**
   - MySQL (Moodle既存DB)
   - PostgreSQL (新規テーブル用)
   - ChromaDB (埋め込みベクトル)

---

## 技術スタック

### Frontend

| 項目 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| フレームワーク | React | 18.3.1 | UI構築 |
| 言語 | TypeScript | 5.x | 型安全性 |
| 状態管理 | Zustand | 4.x | グローバル状態 |
| ルーティング | React Router | 6.x | SPA ルーティング |
| UIライブラリ | Material-UI | 5.x | コンポーネント |
| スタイリング | Tailwind CSS | 3.x | ユーティリティCSS |
| HTTP通信 | Axios | 1.x | API通信 |
| Markdown表示 | react-markdown | 9.x | コンテンツ表示 |
| 数式表示 | KaTeX | 0.16.x | 数式レンダリング |

### BFF Server

| 項目 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| ランタイム | Node.js | 18.x | サーバー実行環境 |
| フレームワーク | Express | 4.x | Webサーバー |
| セッション | express-session | 1.x | セッション管理 |
| CORS | cors | 2.x | クロスオリジン対応 |
| プロキシ | http-proxy-middleware | 2.x | APIプロキシ |

### Backend Services

| 項目 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| LMS | Moodle | 4.x | 既存学習管理 |
| API | FastAPI | 0.100+ | カスタムAPI |
| ベクトルDB | ChromaDB | 0.4.x | セマンティック検索 |
| AI | OpenAI API | GPT-4 | AIチャット |

### インフラ

| 項目 | 技術 | 用途 |
|------|------|------|
| CDN | CloudFront | 静的コンテンツ配信 |
| ストレージ | S3 | フロントエンドホスティング |
| コンピューティング | EC2 | BFF・Moodleサーバー |
| データベース | RDS (MySQL) | Moodleデータ |
| データベース | RDS (PostgreSQL) | 新規テーブル |
| リバースプロキシ | Nginx | HTTPS終端・負荷分散 |

---

## データベース設計方針

### 基本方針

1. **Moodle既存DBは変更しない**
   - カラム追加・削除禁止
   - 既存テーブルの構造変更禁止
   - READ操作のみ許可

2. **新規テーブルは別DBに作成**
   - PostgreSQLに新規スキーマを作成
   - Moodle DBとは物理的に分離
   - 外部キーでMoodle DBのIDを参照（論理的結合）

3. **トランザクション管理**
   - Moodle DB: Moodle標準APIを使用
   - 新規DB: FastAPI/BFF経由でCRUD

### 新規テーブル設計

#### 1. コンテンツタグテーブル (content_tags)

```sql
CREATE TABLE content_tags (
    id SERIAL PRIMARY KEY,
    moodle_course_id INTEGER NOT NULL,  -- Moodle コースID
    tag_name VARCHAR(100) NOT NULL,      -- タグ名 (例: "デザイン", "初心者向け")
    tag_type VARCHAR(50) NOT NULL,       -- タグ種別 (skill/target/category)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(moodle_course_id, tag_name)
);

CREATE INDEX idx_tags_course ON content_tags(moodle_course_id);
CREATE INDEX idx_tags_name ON content_tags(tag_name);
```

#### 2. 学習履歴拡張テーブル (learning_history_ext)

```sql
CREATE TABLE learning_history_ext (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,     -- MoodleユーザーID
    moodle_course_id INTEGER NOT NULL,   -- MoodleコースID
    viewed_at TIMESTAMP DEFAULT NOW(),   -- 閲覧日時
    completed_at TIMESTAMP,              -- 完了日時
    progress_percentage INTEGER DEFAULT 0, -- 進捗率 (0-100)
    last_activity_type VARCHAR(50),      -- 最終活動タイプ
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_history_user ON learning_history_ext(moodle_user_id);
CREATE INDEX idx_history_course ON learning_history_ext(moodle_course_id);
CREATE INDEX idx_history_viewed ON learning_history_ext(viewed_at);
```

#### 3. レコメンドルールテーブル (recommendation_rules)

```sql
CREATE TABLE recommendation_rules (
    id SERIAL PRIMARY KEY,
    source_course_id INTEGER NOT NULL,    -- 元コースID
    target_course_id INTEGER NOT NULL,    -- 推薦先コースID
    priority INTEGER DEFAULT 0,           -- 優先度
    reason TEXT,                          -- 推薦理由
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rules_source ON recommendation_rules(source_course_id);
```

#### 4. AIチャット履歴テーブル (ai_chat_history)

```sql
CREATE TABLE ai_chat_history (
    id SERIAL PRIMARY KEY,
    moodle_user_id INTEGER NOT NULL,     -- ユーザーID
    session_id VARCHAR(100) NOT NULL,    -- セッションID
    role VARCHAR(20) NOT NULL,           -- user/assistant
    message TEXT NOT NULL,               -- メッセージ内容
    context_course_id INTEGER,           -- 文脈コースID
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_user ON ai_chat_history(moodle_user_id);
CREATE INDEX idx_chat_session ON ai_chat_history(session_id);
CREATE INDEX idx_chat_created ON ai_chat_history(created_at);
```

#### 5. 案件情報テーブル (job_opportunities)

```sql
CREATE TABLE job_opportunities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,         -- 案件タイトル
    description TEXT,                     -- 案件説明
    category VARCHAR(50),                 -- カテゴリ (design/video/etc)
    skill_level VARCHAR(50),             -- 必要スキルレベル
    reward_amount INTEGER,                -- 報酬額
    deadline DATE,                        -- 締切日
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_category ON job_opportunities(category);
CREATE INDEX idx_jobs_active ON job_opportunities(is_active);
```

#### 6. リテンションメッセージテーブル (retention_messages)

```sql
CREATE TABLE retention_messages (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,   -- banner/notification
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_condition VARCHAR(100),       -- 表示条件 (graduated/inactive/all)
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 機能別設計方針

### カテゴリ1: 学習コンテンツ機能

#### 1.1 ハイブリッド・コンテンツ

**設計方針:**
- Moodleの標準機能（コース、アクティビティ）を最大限活用
- 動画: Moodleの「ページ」または「ファイル」アクティビティ
- クイズ: Moodleの「小テスト」アクティビティ
- ロードマップ: Moodleの「ラベル」または「ページ」で進行状況を可視化

**実装手順:**
1. Moodleでコースカテゴリを作成
   - スキマ時間コンテンツ
   - 体系的学習コンテンツ
2. 各コースに適切なアクティビティを配置
3. フロントエンドで見やすく表示
   - カード型UI
   - フィルタリング機能

**画面設計:**
```
┌─────────────────────────────────┐
│  スキマ時間で学ぶ   体系的に学ぶ │ ← タブ切り替え
├─────────────────────────────────┤
│ [動画] Figma基礎 (5分)  🎬     │
│ [クイズ] デザイン原則 ✓         │
│ [動画] カラー理論 (3分)  🎬     │
└─────────────────────────────────┘
```

---

#### 1.2 実践型ロードマップ

**設計方針:**
- Moodleの「条件付きアクセス」機能を使用
- 前提条件: 課題提出、小テスト合格など
- スキップ機能: 手動で完了マークを許可

**実装詳細:**

1. **Moodleコース設定**
```
セクション1: 基礎知識 (スライド)
  ├─ 完了条件: 閲覧
  └─ 次へ: セクション2へ

セクション2: 実践課題
  ├─ 完了条件: ファイル提出 OR 手動完了
  └─ 次へ: セクション3へ

セクション3: フィードバック
  ├─ AIフィードバック表示
  └─ 次へ: セクション4へ
```

2. **AIフィードバック連携**
```javascript
// BFF API
POST /api/feedback/generate
{
  userId: number,
  courseId: number,
  submissionId: number,
  fileUrl: string
}

// OpenAI API呼び出し
const feedback = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "あなたはデザインの先生です。提出された課題に対して建設的なフィードバックをしてください。"
    },
    {
      role: "user",
      content: `課題: ${assignment.title}\n提出物: ${fileUrl}`
    }
  ]
});
```

**画面フロー:**
```
[座学コンテンツ]
     ↓
[実践課題]
  - ファイルアップロード
  - または「スキップ」
     ↓
[AIフィードバック]
  - 賞賛ポイント
  - 改善ポイント
     ↓
[次のステップ]
```

---

#### 1.3 多様なコンテンツ表示

**設計方針: 案1（タグベースレコメンド）を採用**

**理由:**
- 実装が容易（0.3人月）
- Moodleの標準機能を活用可能
- メンテナンスコストが低い

**実装アプローチ:**

1. **タグ付けシステム**
```javascript
// コースにタグを付与
const courseTags = [
  { courseId: 1, tags: ["デザイン", "初心者", "Figma"] },
  { courseId: 2, tags: ["デザイン", "中級者", "UI/UX"] },
  { courseId: 3, tags: ["動画編集", "初心者", "Premiere"] }
];
```

2. **レコメンドアルゴリズム**
```javascript
// タグの一致度でスコアリング
function recommendCourses(userId: number): Course[] {
  // 1. ユーザーの学習履歴を取得
  const completedCourses = getUserCompletedCourses(userId);

  // 2. 完了コースのタグを集計
  const userTags = extractTags(completedCourses);

  // 3. 類似タグを持つコースを検索
  const recommendations = findCoursesByTags(userTags);

  // 4. スコアリング（タグの一致数）
  return recommendations.sort((a, b) => b.score - a.score);
}
```

3. **API設計**
```typescript
// BFF API
GET /api/courses/recommendations
Response: {
  recommendations: [
    {
      courseId: number,
      title: string,
      matchScore: number,
      matchedTags: string[],
      reason: string  // "「Figma」に興味がある方におすすめ"
    }
  ]
}
```

**UI設計:**
```
┌───────────────────────────────────┐
│  あなたへのおすすめ               │
├───────────────────────────────────┤
│ [UI/UXデザイン実践] 🎯 80%一致   │
│ ┣ タグ: デザイン、UI/UX、Figma   │
│ ┗ 「Figma」に興味がある方に       │
│                                   │
│ [カラーデザイン基礎] 🎯 60%一致  │
│ ┣ タグ: デザイン、初心者          │
│ ┗ 「デザイン」の学習を続ける方に  │
└───────────────────────────────────┘
```

---

#### 1.4 リテンションバナー表示

**設計方針:**
- データベースで管理
- 表示条件をルールベースで制御
- A/Bテストに対応

**実装詳細:**

1. **バナー管理API**
```typescript
// バナー取得API
GET /api/retention/banners?userId={userId}

Response: {
  banners: [
    {
      id: number,
      type: "banner" | "notification",
      title: string,
      content: string,
      actionUrl?: string,
      priority: number
    }
  ]
}
```

2. **表示ロジック**
```javascript
function shouldShowBanner(user, banner) {
  // 卒業後ユーザー
  if (banner.targetCondition === "graduated" && user.isGraduated) {
    return true;
  }

  // 非アクティブユーザー (7日間ログインなし)
  if (banner.targetCondition === "inactive") {
    const lastLogin = user.lastLoginDate;
    const daysSinceLogin = daysBetween(lastLogin, now());
    return daysSinceLogin >= 7;
  }

  // 全ユーザー
  if (banner.targetCondition === "all") {
    return true;
  }

  return false;
}
```

**UI配置:**
```
┌─────────────────────────────────┐
│ マイページ                      │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🎓 学習を続けませんか？      │ │ ← バナー
│ │ 次のステップへ進もう！      │ │
│ │ [詳しく見る]                │ │
│ └─────────────────────────────┘ │
│                                 │
│ あなたの学習状況                │
│ ━━━━━━━━━━━ 75%                │
└─────────────────────────────────┘
```

---

### カテゴリ2: AIサポート機能

#### 2.1 常駐型AIチャット

**設計方針:**
- 全ページに常駐するチャットウィジェット
- ユーザーの文脈（現在のコース、学習履歴）を把握
- OpenAI GPT-4を使用

**アーキテクチャ:**

```
[Frontend]
  │
  ├─ ChatWidget Component (常駐)
  │   ├─ 現在のページ情報を取得
  │   ├─ ユーザーの学習履歴を取得
  │   └─ BFF APIにリクエスト
  │
[BFF]
  │
  ├─ POST /api/ai/chat
  │   ├─ セッション管理
  │   ├─ コンテキスト構築
  │   └─ OpenAI API呼び出し
  │
[PostgreSQL]
  │
  └─ ai_chat_history (履歴保存)
```

**実装詳細:**

1. **フロントエンド: ChatWidget**
```typescript
// src/components/ChatWidget.tsx
const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const currentCourse = useCurrentCourse();
  const user = useAuthStore(state => state.user);

  const sendMessage = async (text: string) => {
    const response = await axios.post('/api/ai/chat', {
      userId: user.id,
      message: text,
      context: {
        courseId: currentCourse?.id,
        courseName: currentCourse?.name,
        userProgress: currentCourse?.progress
      }
    });

    setMessages([...messages, response.data]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && <ChatWindow messages={messages} onSend={sendMessage} />}
      <button onClick={() => setIsOpen(!isOpen)}>💬</button>
    </div>
  );
};
```

2. **BFF: AI Chat API**
```javascript
// bff-server/routes/ai.js
router.post('/chat', async (req, res) => {
  const { userId, message, context } = req.body;

  // 1. チャット履歴を取得
  const history = await getChatHistory(userId);

  // 2. ユーザー学習履歴を取得
  const learningHistory = await getLearningHistory(userId);

  // 3. コンテキストを構築
  const systemPrompt = buildSystemPrompt(context, learningHistory);

  // 4. OpenAI API呼び出し
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ]
  });

  // 5. 履歴を保存
  await saveChatHistory(userId, message, response);

  res.json({ message: response.choices[0].message.content });
});

function buildSystemPrompt(context, learningHistory) {
  return `
あなたは学習支援AIアシスタントです。

【現在の状況】
- 閲覧中のコース: ${context.courseName}
- 進捗率: ${context.userProgress}%

【学習履歴】
${learningHistory.map(h => `- ${h.courseName} (完了)`).join('\n')}

【役割】
- 学習者の質問に丁寧に答える
- 現在のコース内容を踏まえた回答をする
- 次のステップを提案する
`;
}
```

**UI設計:**
```
┌─────────────────────┐
│ AIアシスタント 💬  │
├─────────────────────┤
│ こんにちは！         │
│ 何か質問は          │
│ ありますか？         │
├─────────────────────┤
│ > Figmaの使い方が   │
│   わかりません       │
│                     │
│ Figmaの基本的な     │
│ 使い方について...   │
├─────────────────────┤
│ [メッセージを入力]  │
└─────────────────────┘
```

---

#### 2.2 実践AIツール連携

**設計方針:**
- シンプルなURL遷移
- 外部ツールへのディープリンク

**実装:**
```html
<!-- Moodleコース内にリンクを配置 -->
<a href="https://figma.com/ai-tool" target="_blank">
  🤖 AI制作ツールを使う
</a>
```

**対応工数:** 0人月（URLリンクのみ）

---

### カテゴリ3: 進捗・キャリア管理機能

#### 3.1 学習ダッシュボード

**設計方針:**
- マイページで一元表示
- リアルタイム進捗率計算
- 視覚的なプログレスバー

**データ取得:**

1. **Moodleから取得**
   - 登録コース一覧
   - 各コースの完了率
   - 最終アクセス日時

2. **PostgreSQLから取得**
   - 拡張学習履歴
   - 目標設定
   - 学習計画

**API設計:**
```typescript
// ダッシュボードデータ取得
GET /api/dashboard?userId={userId}

Response: {
  user: {
    id: number,
    name: string,
    totalCourses: number,
    completedCourses: number,
    overallProgress: number  // 全体進捗率
  },
  currentCourses: [
    {
      courseId: number,
      title: string,
      progress: number,
      lastAccessed: string,
      nextActivity: string,
      estimatedCompletion: string
    }
  ],
  roadmap: {
    totalSteps: number,
    completedSteps: number,
    currentStep: {
      title: string,
      description: string
    },
    nextSteps: [...]
  },
  achievements: [...]
}
```

**UI設計:**
```
┌─────────────────────────────────┐
│ マイページ                      │
├─────────────────────────────────┤
│ 全体進捗: ████████░░ 75%       │
│                                 │
│ 現在の学習中コース              │
│ ┌─────────────────────────────┐ │
│ │ Figma基礎                   │ │
│ │ ████████░░ 80%              │ │
│ │ 次: レイアウト実践          │ │
│ └─────────────────────────────┘ │
│                                 │
│ ロードマップ                    │
│ ┣━ 基礎知識 ✓                  │
│ ┣━ 実践課題 (進行中)           │
│ ┗━ 最終プロジェクト            │
└─────────────────────────────────┘
```

---

#### 3.2 案件提供

**設計方針: 案1（CSV登録）を採用**

**理由:**
- 実装工数が少ない（0.6人月）
- 運用開始が早い
- 必要に応じて管理画面を後から追加可能

**実装アプローチ:**

1. **CSV形式定義**
```csv
title,description,category,skill_level,reward_amount,deadline
"LPデザイン制作","ECサイトのランディングページをデザイン",design,intermediate,50000,2025-12-31
"動画編集案件","YouTubeチャンネルの動画編集",video,beginner,30000,2025-11-30
```

2. **データ投入スクリプト**
```javascript
// scripts/import-jobs.js
const csv = require('csv-parser');
const fs = require('fs');
const { pool } = require('../db');

async function importJobs(csvPath) {
  const jobs = [];

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => jobs.push(row))
    .on('end', async () => {
      for (const job of jobs) {
        await pool.query(`
          INSERT INTO job_opportunities
          (title, description, category, skill_level, reward_amount, deadline)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [job.title, job.description, job.category, job.skill_level,
            job.reward_amount, job.deadline]);
      }
      console.log('✅ Jobs imported:', jobs.length);
    });
}
```

3. **案件一覧API**
```typescript
// 案件一覧取得
GET /api/jobs?category=design&skillLevel=beginner

Response: {
  jobs: [
    {
      id: number,
      title: string,
      description: string,
      category: string,
      skillLevel: string,
      rewardAmount: number,
      deadline: string,
      isActive: boolean
    }
  ]
}
```

**UI設計:**
```
┌─────────────────────────────────┐
│ 案件一覧                        │
│ [デザイン] [動画] [すべて]     │ ← フィルタ
├─────────────────────────────────┤
│ 💼 LPデザイン制作              │
│    カテゴリ: デザイン           │
│    スキルレベル: 中級           │
│    報酬: ¥50,000                │
│    締切: 2025/12/31             │
│    [詳細を見る]                 │
├─────────────────────────────────┤
│ 🎬 YouTube動画編集             │
│    カテゴリ: 動画編集           │
│    スキルレベル: 初級           │
│    報酬: ¥30,000                │
│    締切: 2025/11/30             │
│    [詳細を見る]                 │
└─────────────────────────────────┘
```

---

## セキュリティ設計

### 認証・認可

1. **セッションベース認証**
```javascript
// BFF Server
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS のみ
    httpOnly: true,    // XSS 対策
    sameSite: 'strict', // CSRF 対策
    maxAge: 24 * 60 * 60 * 1000  // 24時間
  }
}));
```

2. **CORS設定**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
```

3. **APIトークン管理**
```javascript
// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Moodle API Token
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
```

### データ保護

1. **個人情報の暗号化**
   - パスワード: bcrypt
   - 機密情報: AES-256

2. **SQL インジェクション対策**
   - プリペアドステートメント使用
   - ORM (Sequelize/TypeORM) 使用

3. **XSS対策**
   - エスケープ処理
   - Content Security Policy (CSP)

---

## パフォーマンス設計

### フロントエンド最適化

1. **コード分割**
```javascript
// React.lazy でルート単位で分割
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Courses = React.lazy(() => import('./pages/Courses'));
```

2. **画像最適化**
   - WebP形式使用
   - Lazy loading
   - CloudFront経由で配信

3. **キャッシュ戦略**
   - index.html: `max-age=0`
   - static/*: `max-age=31536000, immutable`

### バックエンド最適化

1. **データベースクエリ**
   - インデックス作成
   - N+1問題の回避
   - ページネーション実装

2. **API レスポンス**
   - gzip圧縮
   - 不要なデータを返さない
   - GraphQL検討（必要に応じて）

3. **キャッシング**
   - Redis導入（セッション、頻繁にアクセスするデータ）
   - ChromaDB（ベクトル検索キャッシュ）

---

## 開発フロー

### Git ブランチ戦略

```
main (本番)
  ↑
develop (開発)
  ↑
feature/xxx (機能開発)
```

### デプロイフロー

1. **開発環境**
   - ローカル開発
   - Docker Compose

2. **ステージング環境**
   - EC2 (開発サーバー)
   - 本番と同じ構成

3. **本番環境**
   - CloudFront + S3 (Frontend)
   - EC2 + Nginx (BFF)
   - RDS (Database)

---

## 今後の拡張性

1. **スケーラビリティ**
   - BFFサーバーの水平スケール（複数台）
   - ロードバランサー導入
   - データベースのリードレプリカ

2. **機能追加**
   - プッシュ通知
   - リアルタイムチャット（WebSocket）
   - モバイルアプリ対応

3. **分析機能**
   - Google Analytics統合
   - ユーザー行動分析
   - A/Bテスト基盤

---

## 参考資料

- [Moodle Developer Documentation](https://docs.moodle.org/dev/)
- [React Documentation](https://react.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)
