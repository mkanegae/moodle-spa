# ユーザートラッキング機能実装ガイド

## 概要

このドキュメントでは、以下の機能の実装について説明します：

1. **ユーザーごとの最終アクセスコース追跡**
2. **ユーザープロフィール設定管理**

## アーキテクチャ

```
フロントエンド (React)
    ↓ HTTP Request
BFF Server (Node.js/Express) - ポート 3001
    ↓ HTTP Request
FastAPI Server (Python) - ポート 8001
    ↓ SQL Query
Moodle Database (MySQL)
    ├─ mdl_user_last_course_access (新規テーブル)
    └─ mdl_user_profile_settings (新規テーブル)
```

## セットアップ手順

### 1. データベーステーブルの作成

Moodleデータベースに接続してテーブルを作成:

```bash
# MySQLに接続
mysql -h <MOODLE_DB_HOST> -u <MOODLE_DB_USER> -p <MOODLE_DB_NAME>

# SQLファイルを実行
source /home/kanegae100860/moodle-spa/api-server/sql/create_tables.sql
```

または直接SQLを実行:

```bash
mysql -h <MOODLE_DB_HOST> -u <MOODLE_DB_USER> -p <MOODLE_DB_NAME> < /home/kanegae100860/moodle-spa/api-server/sql/create_tables.sql
```

### 2. FastAPIサーバーのセットアップ

```bash
cd /home/kanegae100860/moodle-spa/api-server

# 環境変数ファイルをコピー
cp .env.example .env

# .envファイルを編集してMoodleデータベースの接続情報を設定
nano .env
```

`.env`の設定例:
```env
MOODLE_DB_HOST=15.168.134.84
MOODLE_DB_PORT=3306
MOODLE_DB_USER=moodleuser
MOODLE_DB_PASSWORD=your_password
MOODLE_DB_NAME=moodle

ALLOWED_ORIGINS=https://56.155.42.38,http://localhost:3000
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8001
```

### 3. 依存パッケージのインストール

```bash
cd /home/kanegae100860/moodle-spa/api-server

# Pythonの仮想環境を作成（推奨）
python3 -m venv venv
source venv/bin/activate

# 依存パッケージをインストール
pip install -r requirements.txt
```

### 4. FastAPIサーバーの起動

#### 開発モード
```bash
cd /home/kanegae100860/moodle-spa/api-server
python main.py
```

#### 本番モード
```bash
cd /home/kanegae100860/moodle-spa/api-server
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

#### バックグラウンドで起動
```bash
nohup uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4 > fastapi.log 2>&1 &
```

### 5. BFFサーバーの環境変数確認

`/home/kanegae100860/moodle-spa/bff-server/.env`に以下が設定されていることを確認:

```env
API_SERVER_URL=http://localhost:8001
```

EC2上で動作している場合:
```env
API_SERVER_URL=https://15.168.134.84:8001
```

## API エンドポイント

### BFF経由でのアクセス（推奨）

フロントエンドは以下のBFFエンドポイントを使用します。認証は自動的に処理されます。

#### 1. コースアクセスを記録

```http
POST /api/user-tracking/course-access
Content-Type: application/json

{
  "courseid": 123
}
```

**レスポンス例:**
```json
{
  "id": 1,
  "userid": 456,
  "courseid": 123,
  "lastaccess": 1701234567,
  "accesscount": 5,
  "timemodified": 1701234567,
  "timecreated": 1701230000
}
```

#### 2. 最終アクセスコース一覧を取得

```http
GET /api/user-tracking/last-courses?limit=10
```

**レスポンス例:**
```json
[
  {
    "id": 1,
    "userid": 456,
    "courseid": 123,
    "lastaccess": 1701234567,
    "accesscount": 5,
    "course_fullname": "Introduction to Python",
    "course_shortname": "PY101",
    "course_summary": "Learn Python basics"
  }
]
```

#### 3. 最もアクセスの多いコース一覧を取得

```http
GET /api/user-tracking/most-accessed-courses?limit=5
```

#### 4. プロフィール設定を取得

```http
GET /api/profile-settings?auto_create=true
```

`auto_create=true`を指定すると、設定が存在しない場合にデフォルト値で自動作成されます。

**レスポンス例:**
```json
{
  "id": 1,
  "userid": 456,
  "theme": "dark",
  "language": "ja",
  "notifications_enabled": true,
  "email_notifications": true,
  "timezone": "Asia/Tokyo",
  "items_per_page": 20,
  "avatar_url": null,
  "bio": "Hello!",
  "preferences": {
    "custom_key": "custom_value"
  },
  "timemodified": 1701234567,
  "timecreated": 1701230000
}
```

#### 5. プロフィール設定を作成

```http
POST /api/profile-settings
Content-Type: application/json

{
  "theme": "dark",
  "language": "ja",
  "bio": "こんにちは！",
  "preferences": {
    "custom_setting": "value"
  }
}
```

#### 6. プロフィール設定を更新

```http
PUT /api/profile-settings
Content-Type: application/json

{
  "theme": "light",
  "items_per_page": 50
}
```

## フロントエンド実装例

### Reactでの使用例

```typescript
// services/userTracking.ts

import axios from 'axios';

const BFF_URL = process.env.REACT_APP_BFF_URL || 'http://localhost:3001';

// コースアクセスを記録
export const recordCourseAccess = async (courseid: number) => {
  const response = await axios.post(
    `${BFF_URL}/api/user-tracking/course-access`,
    { courseid },
    { withCredentials: true }
  );
  return response.data;
};

// 最終アクセスコース一覧を取得
export const getLastAccessedCourses = async (limit: number = 10) => {
  const response = await axios.get(
    `${BFF_URL}/api/user-tracking/last-courses?limit=${limit}`,
    { withCredentials: true }
  );
  return response.data;
};

// プロフィール設定を取得
export const getProfileSettings = async (autoCreate: boolean = true) => {
  const response = await axios.get(
    `${BFF_URL}/api/profile-settings?auto_create=${autoCreate}`,
    { withCredentials: true }
  );
  return response.data;
};

// プロフィール設定を更新
export const updateProfileSettings = async (settings: any) => {
  const response = await axios.put(
    `${BFF_URL}/api/profile-settings`,
    settings,
    { withCredentials: true }
  );
  return response.data;
};
```

### コンポーネントでの使用例

```typescript
import React, { useEffect, useState } from 'react';
import { getLastAccessedCourses, recordCourseAccess } from '../services/userTracking';

const MyCoursesPage = () => {
  const [lastCourses, setLastCourses] = useState([]);

  useEffect(() => {
    // 最終アクセスコース一覧を取得
    const fetchLastCourses = async () => {
      try {
        const courses = await getLastAccessedCourses(10);
        setLastCourses(courses);
      } catch (error) {
        console.error('Failed to fetch last courses:', error);
      }
    };

    fetchLastCourses();
  }, []);

  const handleCourseClick = async (courseid: number) => {
    // コースアクセスを記録
    try {
      await recordCourseAccess(courseid);
      console.log('Course access recorded');
    } catch (error) {
      console.error('Failed to record course access:', error);
    }
  };

  return (
    <div>
      <h2>最近アクセスしたコース</h2>
      <ul>
        {lastCourses.map((course) => (
          <li key={course.id}>
            <a onClick={() => handleCourseClick(course.courseid)}>
              {course.course_fullname}
            </a>
            <span>アクセス回数: {course.accesscount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

## テーブル構造

### 1. mdl_user_last_course_access

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | BIGINT | 主キー |
| userid | BIGINT | MoodleユーザーID |
| courseid | BIGINT | MoodleコースID |
| lastaccess | BIGINT | 最終アクセス時刻（UNIX timestamp） |
| accesscount | INT | アクセス回数 |
| timemodified | BIGINT | 更新時刻 |
| timecreated | BIGINT | 作成時刻 |

**インデックス:**
- `UNIQUE(userid, courseid)` - 1ユーザー1コースに1レコード
- `idx_user_lastaccess(userid, lastaccess DESC)` - 日付順検索用
- `idx_user_accesscount(userid, accesscount DESC)` - 頻度順検索用

### 2. mdl_user_profile_settings

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | BIGINT | 主キー |
| userid | BIGINT | MoodleユーザーID（ユニーク） |
| theme | VARCHAR(20) | テーマ（light/dark） |
| language | VARCHAR(10) | 言語（ja/en） |
| notifications_enabled | TINYINT(1) | 通知有効化 |
| email_notifications | TINYINT(1) | メール通知 |
| timezone | VARCHAR(50) | タイムゾーン |
| items_per_page | INT | 表示件数 |
| avatar_url | TEXT | アバターURL |
| bio | TEXT | 自己紹介 |
| preferences | JSON | カスタム設定 |
| timemodified | BIGINT | 更新時刻 |
| timecreated | BIGINT | 作成時刻 |

## トラブルシューティング

### FastAPIサーバーが起動しない

1. **データベース接続エラー**
   ```bash
   # .envファイルの設定を確認
   cat /home/kanegae100860/moodle-spa/api-server/.env

   # MySQLに接続できるか確認
   mysql -h <MOODLE_DB_HOST> -u <MOODLE_DB_USER> -p
   ```

2. **ポートが既に使用されている**
   ```bash
   # ポート8001を使用しているプロセスを確認
   lsof -i :8001

   # プロセスを終了
   kill -9 <PID>
   ```

### BFFからFastAPIに接続できない

1. **FastAPIが起動しているか確認**
   ```bash
   curl http://localhost:8001/health
   ```

2. **環境変数を確認**
   ```bash
   # BFFの.envファイルを確認
   cat /home/kanegae100860/moodle-spa/bff-server/.env | grep API_SERVER_URL
   ```

### テーブルが作成されていない

```bash
# MySQLに接続してテーブルを確認
mysql -h <MOODLE_DB_HOST> -u <MOODLE_DB_USER> -p <MOODLE_DB_NAME>

# テーブル一覧を表示
SHOW TABLES LIKE 'mdl_user_%';

# 手動でSQLを実行
source /home/kanegae100860/moodle-spa/api-server/sql/create_tables.sql
```

## 本番環境デプロイ

### Systemdサービスとして登録（推奨）

`/etc/systemd/system/fastapi-moodle.service`を作成:

```ini
[Unit]
Description=FastAPI Moodle User Tracking
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/kanegae100860/moodle-spa/api-server
Environment="PATH=/home/kanegae100860/moodle-spa/api-server/venv/bin"
ExecStart=/home/kanegae100860/moodle-spa/api-server/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

サービスを有効化:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fastapi-moodle
sudo systemctl start fastapi-moodle
sudo systemctl status fastapi-moodle
```

## まとめ

この実装により、以下が可能になります：

1. ユーザーのコースアクセス履歴を自動追跡
2. 最近アクセスしたコース・よくアクセスするコースの表示
3. ユーザーごとのカスタマイズ可能なプロフィール設定
4. テーマ、言語、通知設定などの個人設定の保存

すべての通信はBFFを経由し、セキュアに認証されます。
