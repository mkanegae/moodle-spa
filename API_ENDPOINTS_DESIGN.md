# API エンドポイント設計書

## 概要

このドキュメントは、Moodle SPA プロジェクトの新しいAPIエンドポイント設計を説明します。
すべてのエンドポイントは、BFFサーバー経由でアクセスされ、必要に応じてFastAPIサーバーにプロキシされます。

## アーキテクチャ

```
Frontend (React)
    ↓
BFF Server (Express.js, Port: 3001)
    ↓
    ├─→ Moodle API (認証、コース情報など)
    └─→ FastAPI Server (Port: 8001, カスタムデータ)
```

## 認証

すべてのエンドポイントは `requireAuth` ミドルウェアで保護されており、セッション認証が必要です。

## エンドポイント一覧

### 1. プロフィール関連

#### 1.1 プロフィール取得

**BFF エンドポイント:**
```
GET /api/users/{userid}/profile
```

**FastAPI エンドポイント:**
```
GET /api/users/{userid}/profile
```

**説明:**
ユーザーの統合プロフィール情報を取得します。
- FastAPIからプロフィール設定を取得
- Moodle APIからユーザー基本情報を取得してマージ

**レスポンス例:**
```json
{
  "userid": 123,
  "username": "test_user",
  "email": "test@example.com",
  "firstname": "太郎",
  "lastname": "山田",
  "fullname": "山田 太郎",
  "settings": {
    "id": 1,
    "userid": 123,
    "theme": "light",
    "language": "ja",
    "notifications_enabled": true,
    "email_notifications": true,
    "timezone": "Asia/Tokyo",
    "items_per_page": 20,
    "avatar_url": null,
    "bio": null,
    "preferences": {},
    "timemodified": 1234567890,
    "timecreated": 1234567890
  }
}
```

#### 1.2 プロフィール更新

**BFF エンドポイント:**
```
POST /api/users/{userid}/profile
```

**FastAPI エンドポイント:**
```
POST /api/users/{userid}/profile
```

**リクエストボディ:**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications_enabled": false,
  "email_notifications": true,
  "timezone": "Asia/Tokyo",
  "items_per_page": 30,
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "こんにちは",
  "preferences": {
    "custom_key": "custom_value"
  }
}
```

**説明:**
プロフィール設定を更新します。設定が存在しない場合は自動作成されます。

---

### 2. 再開コース関連

#### 2.1 再開コース取得

**BFF エンドポイント:**
```
GET /api/users/{userid}/resume-courses?limit=5
```

**FastAPI エンドポイント:**
```
GET /api/users/{userid}/resume-courses?limit=5
```

**クエリパラメータ:**
- `limit`: 取得件数（デフォルト: 5）

**説明:**
最後にアクセスしたコースで、まだ完了していないものを返します。

**レスポンス例:**
```json
[
  {
    "courseid": 101,
    "fullname": "Python入門",
    "shortname": "PY101",
    "summary": "Pythonの基礎を学ぶコース",
    "lastaccess": 1234567890,
    "progress": 45.5,
    "accesscount": 12
  },
  {
    "courseid": 102,
    "fullname": "データベース設計",
    "shortname": "DB201",
    "summary": "データベース設計の基礎",
    "lastaccess": 1234567800,
    "progress": 30.0,
    "accesscount": 8
  }
]
```

---

### 3. バッジ関連

#### 3.1 ユーザーバッジ取得

**BFF エンドポイント:**
```
GET /api/users/{userid}/badges
```

**FastAPI エンドポイント:**
```
GET /api/users/{userid}/badges
```

**説明:**
ユーザーが獲得したバッジ情報を取得します。
- まずMoodle APIから取得を試みる（`core_badges_get_user_badges`）
- 失敗した場合はFastAPIからフォールバック

**レスポンス例:**
```json
{
  "userid": 123,
  "total_badges": 5,
  "badges": [
    {
      "id": 1,
      "name": "初心者コンプリート",
      "description": "初心者コースをすべて完了",
      "image_url": "https://example.com/badges/beginner.png",
      "date_issued": 1234567890,
      "issuer_name": "Moodle System"
    }
  ]
}
```

---

### 4. ロードマップ関連

#### 4.1 ロードマップ一覧取得

**BFF エンドポイント:**
```
GET /api/roadmaps?category=programming&difficulty=beginner&limit=20&offset=0
```

**FastAPI エンドポイント:**
```
GET /api/roadmaps?category=programming&difficulty=beginner&limit=20&offset=0
```

**クエリパラメータ:**
- `category`: カテゴリ名（オプション）
- `difficulty`: 難易度（beginner/intermediate/advanced、オプション）
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

**レスポンス例:**
```json
{
  "total": 10,
  "roadmaps": [
    {
      "id": 1,
      "title": "Webデベロッパーへの道",
      "description": "フロントエンドからバックエンドまで",
      "category": "programming",
      "difficulty": "beginner",
      "estimated_hours": 120,
      "courses": [
        {
          "courseid": 101,
          "order": 1,
          "required": true
        },
        {
          "courseid": 102,
          "order": 2,
          "required": false
        }
      ],
      "created_at": 1234567890
    }
  ]
}
```

#### 4.2 ロードマップ検索

**BFF エンドポイント:**
```
GET /api/roadmaps/search?keyword=python&limit=20&offset=0
```

**FastAPI エンドポイント:**
```
GET /api/roadmaps/search?keyword=python&limit=20&offset=0
```

**クエリパラメータ:**
- `keyword`: 検索キーワード（必須）
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

**説明:**
タイトルや説明文でロードマップを検索します。

#### 4.3 カテゴリ別ロードマップ取得

**BFF エンドポイント:**
```
GET /api/roadmaps/category/{category}?limit=20&offset=0
```

**FastAPI エンドポイント:**
```
GET /api/roadmaps/category/{category}?limit=20&offset=0
```

**パスパラメータ:**
- `category`: カテゴリ名

**クエリパラメータ:**
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

**レスポンス例:**
```json
{
  "category": "programming",
  "total": 15,
  "roadmaps": [...]
}
```

---

## 既存エンドポイントとの比較

### 元の要求 → 実装されたエンドポイント

| 元のエンドポイント | 実装エンドポイント | 変更点 |
|------------------|------------------|--------|
| `GET /api/v1/profile/{user-id}` | `GET /api/users/{userid}/profile` | URLパスを統一、v1削除 |
| `GET /api/v1/resume-course/{user-id}` | `GET /api/users/{userid}/resume-courses` | 複数形に変更、統一感向上 |
| `POST /api/v1/profile/` | `POST /api/users/{userid}/profile` | useridをパスパラメータに |
| `GET /api/v1/badges/{user-id}` | `GET /api/users/{userid}/badges` | URLパスを統一 |
| `GET /api/roadmap` | `GET /api/roadmaps` | 複数形に変更 |
| `POST /api/roadmap/{keyword}` | `GET /api/roadmaps/search?keyword={keyword}` | GETメソッドに変更、クエリパラメータ使用 |
| `POST /api/roadmaps/category/{category}` | `GET /api/roadmaps/category/{category}` | GETメソッドに変更 |

## エラーハンドリング

すべてのエンドポイントは、エラー時に以下の形式のレスポンスを返します：

```json
{
  "error": "エラーの概要",
  "detail": "詳細なエラーメッセージ（オプション）"
}
```

**HTTPステータスコード:**
- `200 OK`: 成功
- `201 Created`: 作成成功
- `400 Bad Request`: リクエストが不正
- `401 Unauthorized`: 認証が必要
- `404 Not Found`: リソースが見つからない
- `409 Conflict`: リソースが既に存在
- `500 Internal Server Error`: サーバーエラー

## TODO（今後の実装）

### ロードマップ機能
- [ ] データベーステーブルの作成（`mdl_learning_roadmaps`）
- [ ] CRUD操作の実装（crud.py）
- [ ] 実際のロードマップデータの保存・取得

### バッジ機能
- [ ] Moodle APIとの統合テスト
- [ ] カスタムバッジシステムの実装（必要に応じて）

### 進捗率計算
- [ ] コース完了率の正確な計算
- [ ] Moodle completion APIとの統合

## 使用例

### フロントエンドからの呼び出し例

```javascript
// プロフィール取得
const response = await fetch('/api/users/123/profile', {
  credentials: 'include' // セッション認証に必要
});
const profile = await response.json();

// プロフィール更新
const updateResponse = await fetch('/api/users/123/profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    theme: 'dark',
    language: 'ja'
  })
});

// 再開コース取得
const resumeCourses = await fetch('/api/users/123/resume-courses?limit=5', {
  credentials: 'include'
});

// ロードマップ検索
const roadmaps = await fetch('/api/roadmaps/search?keyword=python', {
  credentials: 'include'
});
```

## セキュリティ

- すべてのエンドポイントは認証が必要
- セッションベースの認証（Cookie使用）
- CORS設定でオリジンを制限
- Rate limitingを適用（BFF: 15分間に100リクエスト）
- Helmetによるセキュリティヘッダー設定

## パフォーマンス考慮事項

- データベースクエリには適切なインデックスを使用
- 頻繁にアクセスされるデータはキャッシュを検討
- ページネーションの実装（limit/offset）
- 並列リクエストの活用（Promise.all）
