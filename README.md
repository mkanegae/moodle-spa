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
- EC2上で以下が稼働していること:
  - Moodle LMS (Web Service有効化)
  - MySQL/MariaDB
  - ChromaDB (オプション)
  - FastAPI Server (オプション)

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/mkanegae/moodle-spa.git
cd moodle-spa
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、EC2上のサービスエンドポイントを設定します。

### 3. Dockerコンテナの起動

```bash
docker-compose up -d
```

サービスが起動します：
- Frontend: http://localhost:3000
- BFF Server: http://localhost:3001

## ライセンス

MIT
