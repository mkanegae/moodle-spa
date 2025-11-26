# Moodle SPA デプロイメントガイド (Docker不使用)

EC2サーバー (15.168.134.84) にMoodle SPAをデプロイする手順

## 前提条件

### EC2サーバーにインストールが必要なもの

1. **Node.js 18以上**
   ```bash
   # Node.jsのインストール (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # バージョン確認
   node --version  # v18.x.x以上
   npm --version
   ```

2. **PM2 (プロセス管理) - 推奨**
   ```bash
   sudo npm install -g pm2

   # 起動時の自動起動設定
   pm2 startup
   # 表示されたコマンドを実行
   ```

3. **Moodle LMS**
   - EC2サーバー(15.168.134.84)にMoodleがインストールされていること
   - Moodle Web Serviceが有効化されていること
   - ポート80でアクセス可能であること

## デプロイ手順

### 1. リポジトリのクローン

```bash
# EC2サーバーにSSH接続
ssh user@15.168.134.84

# プロジェクトディレクトリに移動（または作成）
cd /home/your-user/

# リポジトリのクローン
git clone https://github.com/mkanegae/moodle-spa.git
cd moodle-spa
```

### 2. 環境変数の設定

#### BFFサーバーの環境変数

```bash
cd bff-server
cp .env.example .env

# .envファイルを編集（必要に応じて）
nano .env
```

`.env`の内容:
```bash
NODE_ENV=production
PORT=3001
MOODLE_URL=http://15.168.134.84
API_SERVER_URL=http://15.168.134.84:8001
SESSION_SECRET=your-secure-random-secret-min-32-chars
ALLOWED_ORIGINS=http://15.168.134.84:3000,http://localhost:3000
```

**重要:** `SESSION_SECRET`は必ず変更してください
```bash
# ランダムな32文字以上の文字列を生成
openssl rand -base64 32
```

#### フロントエンドの環境変数

```bash
cd ../frontend
cp .env.example .env

# .envファイルを編集（必要に応じて）
nano .env
```

`.env`の内容:
```bash
REACT_APP_MOODLE_URL=http://15.168.134.84
REACT_APP_API_SERVER_URL=http://15.168.134.84:8001
REACT_APP_BFF_URL=http://15.168.134.84:3001
REACT_APP_CHROMADB_ENABLED=true
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### 3. BFFサーバーのデプロイ

```bash
cd /home/your-user/moodle-spa

# デプロイスクリプトに実行権限を付与
chmod +x deploy-bff.sh

# BFFサーバーをデプロイ
./deploy-bff.sh
```

デプロイスクリプトは以下を実行します:
- 依存関係のインストール
- 既存プロセスの停止
- PM2でBFFサーバーを起動（またはバックグラウンドで起動）

**動作確認:**
```bash
# ヘルスチェック
curl http://15.168.134.84:3001/health

# 期待されるレスポンス
# {"status":"ok","timestamp":"...","service":"Moodle BFF","environment":"production"}
```

### 4. フロントエンドのデプロイ

```bash
cd /home/your-user/moodle-spa

# デプロイスクリプトに実行権限を付与
chmod +x deploy-frontend.sh

# フロントエンドをデプロイ
./deploy-frontend.sh
```

デプロイスクリプトは以下を実行します:
- 依存関係のインストール
- Reactアプリケーションのビルド
- `serve`を使用してビルド成果物を配信
- PM2でフロントエンドサーバーを起動（またはバックグラウンドで起動）

**動作確認:**
```bash
# ブラウザで以下にアクセス
http://15.168.134.84:3000
```

## ポート一覧

| サービス | ポート | URL |
|---------|--------|-----|
| Frontend | 3000 | http://15.168.134.84:3000 |
| BFF Server | 3001 | http://15.168.134.84:3001 |
| Moodle LMS | 80 | http://15.168.134.84 |
| FastAPI (AI) | 8001 | http://15.168.134.84:8001 |

## ファイアウォール設定

EC2のセキュリティグループで以下のポートを開放してください:

```bash
# インバウンドルール
- ポート 80 (HTTP) - Moodle
- ポート 3000 (TCP) - Frontend
- ポート 3001 (TCP) - BFF Server
- ポート 8001 (TCP) - FastAPI (オプション)
```

## PM2での管理

### プロセスの確認

```bash
pm2 status
```

### ログの確認

```bash
# BFFサーバーのログ
pm2 logs moodle-bff

# フロントエンドのログ
pm2 logs moodle-frontend

# すべてのログ
pm2 logs
```

### プロセスの再起動

```bash
# BFFサーバーを再起動
pm2 restart moodle-bff

# フロントエンドを再起動
pm2 restart moodle-frontend

# すべてを再起動
pm2 restart all
```

### プロセスの停止

```bash
# BFFサーバーを停止
pm2 stop moodle-bff

# フロントエンドを停止
pm2 stop moodle-frontend
```

### プロセスの削除

```bash
pm2 delete moodle-bff
pm2 delete moodle-frontend
```

## アップデート手順

コードを更新する場合:

```bash
cd /home/your-user/moodle-spa

# 最新のコードを取得
git pull origin master

# BFFサーバーを更新
./deploy-bff.sh

# フロントエンドを更新
./deploy-frontend.sh
```

## トラブルシューティング

### BFFサーバーが起動しない

```bash
# ログを確認
pm2 logs moodle-bff
# または
tail -f /tmp/bff-server.log

# ポートが使用中か確認
sudo netstat -tlnp | grep 3001

# 手動で起動してエラーを確認
cd bff-server
node index.js
```

### フロントエンドにアクセスできない

```bash
# ログを確認
pm2 logs moodle-frontend
# または
tail -f /tmp/frontend-server.log

# ビルドが成功しているか確認
ls -la frontend/build/

# ポートが使用中か確認
sudo netstat -tlnp | grep 3000
```

### Moodleに接続できない

```bash
# Moodleにアクセスできるか確認
curl http://15.168.134.84

# BFFサーバーからMoodleにアクセスできるか確認
curl http://15.168.134.84/webservice/rest/server.php
```

### CORS エラー

BFFサーバーの`.env`ファイルで`ALLOWED_ORIGINS`を確認:

```bash
# 正しいオリジンが設定されているか確認
ALLOWED_ORIGINS=http://15.168.134.84:3000
```

## HTTPS設定（開発環境）

フロントエンド開発サーバーでHTTPSを使用する場合の設定手順です。

### 1. 自己署名SSL証明書の生成

```bash
cd /home/your-user/moodle-spa

# SSL証明書用ディレクトリを作成
mkdir -p ssl

# 自己署名証明書を生成（365日有効）
cd ssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Moodle SPA/CN=localhost"

# 証明書ファイルの確認
ls -lh
# cert.pem と key.pem が生成されていることを確認
```

### 2. フロントエンド環境変数の設定

```bash
cd /home/your-user/moodle-spa/frontend

# .envファイルにHTTPS設定を追加
nano .env
```

以下を追加:
```bash
# HTTPS設定 (開発環境でHTTPSを使用する場合)
HTTPS=true
SSL_CRT_FILE=../ssl/cert.pem
SSL_KEY_FILE=../ssl/key.pem
```

### 3. フロントエンドの起動

```bash
cd /home/your-user/moodle-spa/frontend
npm start
```

これでフロントエンドは `https://localhost:3000` でアクセスできます。

**注意:** 自己署名証明書を使用する場合、ブラウザで警告が表示されます。開発環境では警告を承認して進めてください。

## セキュリティ考慮事項

### 本番環境での推奨設定

1. **SESSION_SECRETの変更**
   ```bash
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

2. **HTTPSの使用**
   - Nginx等のリバースプロキシを導入
   - Let's Encryptで SSL/TLS証明書を取得
   - すべての通信をHTTPSに変更

   ```bash
   # Let's Encryptでの証明書取得例
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **ファイアウォール設定**
   - 必要最小限のポートのみ開放
   - 特定のIPアドレスからのアクセスのみ許可

4. **環境変数の保護**
   ```bash
   chmod 600 .env
   ```

## 参考コマンド

### Node.jsのインストール確認

```bash
node --version
npm --version
```

### PM2のインストール確認

```bash
pm2 --version
```

### プロセスの確認

```bash
# すべてのNode.jsプロセス
ps aux | grep node

# ポートの使用状況
sudo netstat -tlnp | grep -E "3000|3001"
```

### ログファイルの場所

PM2を使用している場合:
```bash
~/.pm2/logs/
```

PM2を使用していない場合:
```bash
/tmp/bff-server.log
/tmp/frontend-server.log
```

## サポート

問題が発生した場合は、以下を確認してください:

1. Node.jsのバージョン (18以上)
2. 環境変数ファイル (.env) の設定
3. ポートの開放状態
4. Moodleの稼働状態
5. ログファイルのエラーメッセージ
