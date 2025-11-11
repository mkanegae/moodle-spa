# Moodle SPA (Single Page Application)

Moodle LMS向けのモダンなReact SPAフロントエンドとBFF (Backend for Frontend)サーバーです。

## 概要

このプロジェクトは以下の構成で動作します：

- **Frontend (React SPA)**: ユーザー向けのモダンなWebアプリケーション
- **BFF Server (Node.js/Express)**: フロントエンドとMoodle/APIサーバー間のプロキシサーバー
- **EC2上のサービス**: Moodle LMS、MySQL、ChromaDB、FastAPI (別途デプロイ)

## 前提条件

- Docker & Docker Compose
- Node.js 18以上 (ローカル開発の場合)
- EC2上で以下が稼働していること：
  - Moodle LMS (Web Service有効化)
  - MySQL/MariaDB
  - ChromaDB (オプション)
  - FastAPI Server (オプション)

## セットアップ手順

### 1. リポジトリのクローンまたはコピー

```bash
cd /home/kanegae100860/moodle-spa
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、EC2上のサービスエンドポイントを設定します：

```bash
# EC2上のMoodle LMS URL
MOODLE_URL=http://ec2-xx-xx-xx-xx.compute.amazonaws.com

# EC2上のFastAPI Server URL (ChromaDB統合)
API_SERVER_URL=http://ec2-xx-xx-xx-xx.compute.amazonaws.com:8001

# BFF Server URL (通常はローカル)
BFF_URL=http://localhost:3001

# Moodle Web Service Token
MOODLE_TOKEN=your_moodle_webservice_token_here
```

### 3. Moodle Web Serviceトークンの取得

1. MoodleにAdmin権限でログイン
2. `サイト管理 > プラグイン > Web services > 外部サービス`にアクセス
3. 新しいサービスを作成 (例: `moodle_mobile_app`)
4. 必要な関数を有効化：
   - `core_webservice_get_site_info`
   - `core_course_get_courses`
   - `core_course_get_contents`
   - `core_enrol_get_enrolled_users`
   - その他必要な関数
5. `サイト管理 > プラグイン > Web services > トークンの管理`
6. 新しいトークンを作成し、`.env`ファイルに設定

### 4. Dockerコンテナの起動

```bash
docker-compose up -d
```

サービスが起動します：
- Frontend: http://localhost:3000
- BFF Server: http://localhost:3001

### 5. 動作確認

#### BFFサーバーのヘルスチェック
```bash
curl http://localhost:3001/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T20:00:00.000Z",
  "service": "Moodle BFF",
  "environment": "production"
}
```

#### フロントエンドの確認
ブラウザで http://localhost:3000 にアクセス

## 開発環境での起動

### Frontend

```bash
cd frontend
npm install
npm start
```

### BFF Server

```bash
cd bff-server
npm install
npm start
```

## ディレクトリ構成

```
moodle-spa/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── services/       # API通信
│   │   ├── routes/         # ルーティング
│   │   └── utils/          # ユーティリティ
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── bff-server/             # BFF Server (Node.js/Express)
│   ├── index.js            # メインサーバー
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker設定
├── .env.example            # 環境変数サンプル
└── README.md               # このファイル
```

## 主な機能

- 学習ダッシュボード
- コース一覧・コンテンツ表示
- AIコンテンツチャット (ChromaDB統合)
- コンテンツ登録・管理
- キャリアパス機能
- Markdown & 動画表示
- 数式表示 (KaTeX)
- シンタックスハイライト

## トラブルシューティング

### BFFサーバーが起動しない

1. `.env`ファイルが正しく設定されているか確認
2. EC2上のMoodleにアクセスできるか確認
   ```bash
   curl -I ${MOODLE_URL}
   ```
3. ログを確認
   ```bash
   docker-compose logs bff-server
   ```

### フロントエンドがBFFに接続できない

1. BFFサーバーが起動しているか確認
   ```bash
   docker-compose ps
   ```
2. `REACT_APP_BFF_URL`が正しく設定されているか確認
3. CORSエラーの場合は、BFFサーバーの`ALLOWED_ORIGINS`を確認

### Moodle APIエラー

1. Moodle Web Serviceが有効化されているか確認
2. トークンが有効か確認
3. 必要な関数が有効化されているか確認

## ライセンス

MIT

## 注意事項

- **Notion MCP機能は含まれていません** (要件により削除済み)
- **Moodle本体は含まれていません** (EC2上で別途デプロイ)
- セッションは現在メモリベース (再起動すると失われます)
- 本番環境ではRedis等の永続化ストレージの使用を推奨
