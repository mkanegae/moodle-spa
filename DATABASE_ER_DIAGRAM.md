# データベース ER図

## 学習ダッシュボードシステム全体のER図

```mermaid
erDiagram
    %% ========================================
    %% ロードマップ関連
    %% ========================================

    learning_roadmaps ||--o{ roadmap_steps : contains
    learning_roadmaps ||--o{ user_roadmaps : enrolled_in
    learning_roadmaps ||--o{ learning_milestones : has
    learning_roadmaps ||--o{ user_learning_goals : related_to
    learning_roadmaps ||--o{ user_learning_plans : plans_for

    roadmap_steps ||--o{ user_task_progress : tracks
    roadmap_steps ||--o| user_roadmaps : current_step

    %% ========================================
    %% ユーザートラッキング関連
    %% ========================================

    mdl_user ||--o{ mdl_user_last_course_access : accesses
    mdl_user ||--|| mdl_user_profile_settings : has_settings
    mdl_course ||--o{ mdl_user_last_course_access : accessed_by

    %% ========================================
    %% テーブル定義
    %% ========================================

    learning_roadmaps {
        int id PK
        varchar name
        text description
        varchar category
        int estimated_duration_hours
        varchar difficulty_level
        varchar icon_url
        boolean is_public
        int display_order
        timestamp created_at
        timestamp updated_at
    }

    roadmap_steps {
        int id PK
        int roadmap_id FK
        int step_number
        varchar step_type
        int moodle_course_id
        int moodle_activity_id
        varchar title
        text description
        int estimated_hours
        int_array prerequisite_step_ids
        boolean is_optional
        jsonb resources
        timestamp created_at
        timestamp updated_at
    }

    user_roadmaps {
        int id PK
        int moodle_user_id
        int roadmap_id FK
        varchar status
        timestamp started_at
        timestamp completed_at
        int total_steps
        int completed_steps
        int progress_percentage
        int current_step_id FK
        timestamp created_at
        timestamp updated_at
    }

    user_learning_goals {
        int id PK
        int moodle_user_id
        int roadmap_id FK
        varchar goal_title
        text goal_description
        varchar goal_type
        date target_date
        varchar status
        int progress_percentage
        timestamp achieved_at
        text notes
        timestamp created_at
        timestamp updated_at
    }

    user_learning_plans {
        int id PK
        int moodle_user_id
        int roadmap_id FK
        varchar plan_type
        date start_date
        date end_date
        int target_hours
        int target_steps
        int actual_hours
        int actual_steps
        int achievement_rate
        text notes
        timestamp created_at
        timestamp updated_at
    }

    user_task_progress {
        int id PK
        int moodle_user_id
        int roadmap_step_id FK
        varchar status
        timestamp started_at
        timestamp completed_at
        int time_spent_minutes
        int self_rating
        text notes
        varchar moodle_completion_status
        timestamp last_synced_at
        timestamp created_at
        timestamp updated_at
    }

    learning_milestones {
        int id PK
        int roadmap_id FK
        int milestone_number
        varchar title
        text description
        varchar icon
        int_array required_step_ids
        varchar badge_name
        varchar badge_icon_url
        timestamp created_at
    }

    mdl_user_last_course_access {
        bigint id PK
        bigint userid
        bigint courseid
        bigint lastaccess
        int accesscount
        bigint timemodified
        bigint timecreated
    }

    mdl_user_profile_settings {
        bigint id PK
        bigint userid UK
        varchar theme
        varchar language
        tinyint notifications_enabled
        tinyint email_notifications
        varchar timezone
        int items_per_page
        text avatar_url
        text bio
        json preferences
        bigint timemodified
        bigint timecreated
    }

    mdl_user {
        bigint id PK
        varchar username
        varchar firstname
        varchar lastname
        varchar email
    }

    mdl_course {
        bigint id PK
        varchar fullname
        varchar shortname
        int category
        int visible
    }
```

## 簡略版ER図（主要な関係のみ）

```mermaid
erDiagram
    LEARNING_ROADMAPS ||--o{ ROADMAP_STEPS : "1対多"
    LEARNING_ROADMAPS ||--o{ USER_ROADMAPS : "1対多"
    LEARNING_ROADMAPS ||--o{ MILESTONES : "1対多"

    ROADMAP_STEPS ||--o{ USER_TASK_PROGRESS : "1対多"

    USER_ROADMAPS }o--|| ROADMAP_STEPS : "現在のステップ"

    MOODLE_USER ||--o{ USER_LAST_ACCESS : "1対多"
    MOODLE_USER ||--|| USER_PROFILE : "1対1"

    MOODLE_COURSE ||--o{ USER_LAST_ACCESS : "1対多"

    LEARNING_ROADMAPS {
        id integer
        name string
        category string
        duration_hours integer
    }

    ROADMAP_STEPS {
        id integer
        roadmap_id integer
        step_number integer
        title string
        moodle_course_id integer
    }

    USER_ROADMAPS {
        id integer
        user_id integer
        roadmap_id integer
        progress_pct integer
        status string
    }

    USER_TASK_PROGRESS {
        id integer
        user_id integer
        step_id integer
        status string
        completed_at timestamp
    }

    MILESTONES {
        id integer
        roadmap_id integer
        title string
        badge_name string
    }

    USER_LAST_ACCESS {
        id integer
        userid integer
        courseid integer
        lastaccess timestamp
        accesscount integer
    }

    USER_PROFILE {
        id integer
        userid integer
        theme string
        language string
    }

    MOODLE_USER {
        id integer
        username string
        email string
    }

    MOODLE_COURSE {
        id integer
        fullname string
    }
```

## テーブル分類図

```mermaid
graph TB
    subgraph "ロードマップ管理"
        LR[learning_roadmaps<br/>ロードマップ定義]
        RS[roadmap_steps<br/>ステップ詳細]
        LM[learning_milestones<br/>マイルストーン]
    end

    subgraph "ユーザー学習管理"
        UR[user_roadmaps<br/>登録・進捗]
        UTP[user_task_progress<br/>タスク進捗]
        ULG[user_learning_goals<br/>学習目標]
        ULP[user_learning_plans<br/>学習計画]
    end

    subgraph "ユーザートラッキング"
        ULCA[mdl_user_last_course_access<br/>最終アクセスコース]
        UPS[mdl_user_profile_settings<br/>プロフィール設定]
    end

    subgraph "Moodle既存テーブル"
        MU[mdl_user<br/>ユーザー]
        MC[mdl_course<br/>コース]
        MCO[mdl_course_completions<br/>完了状況]
    end

    LR --> RS
    LR --> LM
    LR --> UR
    LR --> ULG
    LR --> ULP

    RS --> UTP
    RS -.現在のステップ.-> UR

    MU --> UR
    MU --> UTP
    MU --> ULCA
    MU --> UPS

    MC --> ULCA
    MC -.参照.-> RS

    style LR fill:#e1f5ff
    style RS fill:#e1f5ff
    style LM fill:#e1f5ff

    style UR fill:#fff4e1
    style UTP fill:#fff4e1
    style ULG fill:#fff4e1
    style ULP fill:#fff4e1

    style ULCA fill:#e8f5e9
    style UPS fill:#e8f5e9

    style MU fill:#f3e5f5
    style MC fill:#f3e5f5
    style MCO fill:#f3e5f5
```

## データフロー図

```mermaid
flowchart LR
    subgraph Moodle
        MDB[(Moodle DB<br/>MySQL)]
        MAPI[Moodle API]
    end

    subgraph Backend
        FAST[FastAPI Server<br/>Port 8001]
        BFF[BFF Server<br/>Port 3001]
        PGDB[(PostgreSQL<br/>学習管理DB)]
    end

    subgraph Frontend
        REACT[React SPA<br/>Port 3000]
        DASH[ダッシュボード]
        PROF[プロフィール]
    end

    MDB --> MAPI
    MAPI --> BFF

    PGDB --> FAST
    FAST --> BFF

    BFF --> REACT
    REACT --> DASH
    REACT --> PROF

    style MDB fill:#ffebee
    style PGDB fill:#e8f5e9
    style FAST fill:#fff9c4
    style BFF fill:#e1f5fe
    style REACT fill:#f3e5f5
```

## キーとなる関係性の説明

### 1. ロードマップの階層構造

```
learning_roadmaps (ロードマップ)
    ↓ 1対多
roadmap_steps (ステップ)
    ↓ 1対多
user_task_progress (ユーザー進捗)
```

### 2. ユーザーの学習状態

```
user_roadmaps (ユーザーのロードマップ登録)
    ├─ progress_percentage (全体の進捗率)
    ├─ current_step_id → roadmap_steps (現在のステップ)
    └─ completed_steps / total_steps (完了数/総数)
```

### 3. マイルストーン達成判定

```
learning_milestones (マイルストーン定義)
    ├─ required_step_ids[] (必要なステップID配列)
    └─ user_task_progress (ユーザー進捗) で達成判定
```

### 4. ユーザートラッキング

```
mdl_user (Moodleユーザー)
    ├─ 1対多 → mdl_user_last_course_access (アクセス履歴)
    └─ 1対1 → mdl_user_profile_settings (プロフィール設定)
```

## インデックス戦略

### 高速検索が必要なカラム

```mermaid
graph LR
    A[パフォーマンス最適化] --> B[複合インデックス]
    A --> C[単一インデックス]

    B --> B1[user_roadmaps<br/>moodle_user_id, status]
    B --> B2[user_task_progress<br/>moodle_user_id, status]
    B --> B3[roadmap_steps<br/>roadmap_id, step_number]

    C --> C1[user_learning_goals<br/>target_date]
    C --> C2[user_learning_plans<br/>start_date, end_date]
    C --> C3[mdl_user_last_course_access<br/>userid, lastaccess]
```

## まとめ

このER図は以下の機能を実現します：

1. **ロードマップ管理** - 学習経路の定義と管理
2. **進捗追跡** - ユーザーごとの詳細な進捗管理
3. **目標管理** - 学習目標と計画の設定・追跡
4. **マイルストーン** - 達成感を得られるゲーミフィケーション
5. **ユーザートラッキング** - アクセス履歴とプロフィール管理

すべてのテーブルが適切に正規化され、パフォーマンスを考慮したインデックスが設定されています。
