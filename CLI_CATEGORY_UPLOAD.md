# CLIでカテゴリを一括アップロード

MoodleのGUIでカテゴリアップロード機能がない場合、コマンドラインツールを使ってCSVからカテゴリを一括作成できます。

## 🚀 クイックスタート（3分）

### 前提条件

- Node.js 18以上がインストールされていること
- BFFサーバーが起動していること (`http://localhost:3001`)
- Moodleの管理者アカウント情報

### 手順

#### 1. BFFサーバーを起動

```bash
cd /home/kanegae100860/moodle-spa/bff-server
npm start
```

別のターミナルを開いて次のステップに進みます。

#### 2. カテゴリCSVを準備

```bash
cd /home/kanegae100860/moodle-spa
```

`moodle-category-upload-template.csv` を確認:
```csv
name,parent,idnumber,description,visible
必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
選択科目,0,CAT-ELECTIVE,選択科目のカテゴリです,1
特別講座,0,CAT-SPECIAL,特別講座・セミナー,1
```

#### 3. アップロードスクリプトを実行

```bash
node upload-categories.js moodle-category-upload-template.csv admin adminpassword
```

**パラメータ**:
- `moodle-category-upload-template.csv`: CSVファイルのパス
- `admin`: Moodleの管理者ユーザー名
- `adminpassword`: 管理者パスワード

#### 4. 実行結果

```
=================================================
  Moodle カテゴリ一括アップロードツール
=================================================

📂 CSVファイルを読み込み中: moodle-category-upload-template.csv
✅ 3件のカテゴリを検出

🔍 データを検証中...
✅ データ検証完了

📊 カテゴリ構成:
  - トップレベルカテゴリ: 3件
  - サブカテゴリ: 0件

📝 プレビュー:
  1. 必修科目 (トップレベル)
  2. 選択科目 (トップレベル)
  3. 特別講座 (トップレベル)

続行しますか？ (y/n): y

🔐 ログイン中... (http://localhost:3001)
✅ ログイン成功

📤 ステップ1: トップレベルカテゴリを作成中... (3件)
✅ 3件のトップレベルカテゴリを作成しました

  ✓ 必修科目 (ID: 1)
  ✓ 選択科目 (ID: 2)
  ✓ 特別講座 (ID: 3)

=================================================
  ✅ カテゴリアップロード完了！
=================================================

作成されたカテゴリ: 3件

📋 作成されたカテゴリID一覧:

カテゴリ名,カテゴリID,親ID
─────────────────────────────────
必修科目,1,0
選択科目,2,0
特別講座,3,0

💡 次のステップ:
   1. 上記のカテゴリIDをメモしてください
   2. コースCSVの "category" 列を実際のIDに更新してください
   3. コースをアップロードしてください
```

---

## 📚 詳細な使用方法

### コマンドライン構文

```bash
node upload-categories.js <CSVファイル> <ユーザー名> <パスワード>
```

### オプション

環境変数でBFF URLを指定できます:

```bash
# デフォルト: http://localhost:3001
BFF_URL=http://your-server:3001 node upload-categories.js categories.csv admin password
```

---

## 🔄 段階的アップロード（推奨）

### ステップ1: トップレベルカテゴリのみ作成

#### CSV: `categories-step1.csv`

```csv
name,parent,idnumber,description,visible
必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
選択科目,0,CAT-ELECTIVE,選択科目のカテゴリです,1
特別講座,0,CAT-SPECIAL,特別講座・セミナー,1
```

#### 実行

```bash
node upload-categories.js categories-step1.csv admin adminpassword
```

#### 結果をメモ

```
必修科目 → ID: 1
選択科目 → ID: 2
特別講座 → ID: 3
```

---

### ステップ2: サブカテゴリを作成

#### CSV: `categories-step2.csv`

**重要**: `parent` に前のステップで確認した実際のIDを使用

```csv
name,parent,idnumber,description,visible
基礎教養,1,CAT-REQUIRED-GENERAL,基礎教養科目,1
専門基礎,1,CAT-REQUIRED-MAJOR,専門基礎科目,1
ビジネス系,2,CAT-ELECTIVE-BIZ,ビジネス関連の選択科目,1
IT系,2,CAT-ELECTIVE-IT,IT・プログラミング関連の選択科目,1
語学系,2,CAT-ELECTIVE-LANG,語学関連の選択科目,1
```

#### 実行

```bash
node upload-categories.js categories-step2.csv admin adminpassword
```

#### 実行結果

```
📤 ステップ1: トップレベルカテゴリを作成中... (0件)

⚠️  サブカテゴリが検出されました (5件)
注意: サブカテゴリの親IDは、既存のカテゴリIDである必要があります。

📋 現在のカテゴリ一覧:
  ID 1: 必修科目 (親: なし)
  ID 2: 選択科目 (親: なし)
  ID 3: 特別講座 (親: なし)

サブカテゴリを作成しますか？ (y/n): y

📤 ステップ2: サブカテゴリを作成中... (5件)
✅ 5件のサブカテゴリを作成しました

  ✓ 基礎教養 (ID: 4, 親: 1)
  ✓ 専門基礎 (ID: 5, 親: 1)
  ✓ ビジネス系 (ID: 6, 親: 2)
  ✓ IT系 (ID: 7, 親: 2)
  ✓ 語学系 (ID: 8, 親: 2)
```

---

## 📋 CSVフォーマット

### 必須フィールド

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `name` | カテゴリ名 | `必修科目` |
| `parent` | 親カテゴリID（0=トップレベル） | `0` または `1` |

### オプションフィールド

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `idnumber` | カテゴリID番号（管理用） | `CAT-REQUIRED` |
| `description` | カテゴリの説明 | `必修科目のカテゴリです` |
| `visible` | 表示/非表示（1=表示、0=非表示） | `1` |

### CSV例

```csv
name,parent,idnumber,description,visible
必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
基礎教養,1,CAT-REQUIRED-GENERAL,基礎教養科目,1
```

---

## 🔧 トラブルシューティング

### 問題1: ログインエラー

```
❌ ログイン失敗: ユーザー名またはパスワードが正しくありません
```

**解決方法**:
- ユーザー名とパスワードを確認
- Moodleで管理者権限があるか確認
- BFFサーバーが起動しているか確認 (`http://localhost:3001/health`)

---

### 問題2: BFFサーバーに接続できない

```
❌ ログインエラー: connect ECONNREFUSED 127.0.0.1:3001
```

**解決方法**:
```bash
# BFFサーバーを起動
cd bff-server
npm start

# 別のターミナルでスクリプトを実行
```

---

### 問題3: 親カテゴリが見つからない

```
❌ カテゴリの作成に失敗しました
Moodleエラー: "Parent category not found"
```

**解決方法**:
1. トップレベルカテゴリ（parent=0）を先に作成
2. 作成されたカテゴリIDを確認
3. サブカテゴリのCSVで `parent` を実際のIDに更新
4. 再度実行

---

### 問題4: CSVファイルが見つからない

```
❌ エラー: CSVファイルが見つかりません: categories.csv
```

**解決方法**:
```bash
# ファイルの存在を確認
ls -la moodle-category-upload-template.csv

# フルパスで指定
node upload-categories.js /full/path/to/categories.csv admin password
```

---

### 問題5: 文字化けする

**解決方法**:
CSVファイルをUTF-8で保存し直してください

```bash
# VSCodeで開く
code moodle-category-upload-template.csv
# 右下の文字コードをクリック → UTF-8で保存
```

---

## 💡 高度な使用例

### 例1: 環境変数でBFF URLを指定

```bash
BFF_URL=https://your-server.com:3001 node upload-categories.js categories.csv admin password
```

---

### 例2: デバッグモードで実行

```bash
DEBUG=true node upload-categories.js categories.csv admin password
```

エラー時にスタックトレースが表示されます。

---

### 例3: バッチスクリプトで自動化

```bash
#!/bin/bash

# categories-batch.sh

echo "カテゴリ一括作成スクリプト"

# ステップ1: トップレベルカテゴリ
echo "ステップ1: トップレベルカテゴリを作成"
node upload-categories.js categories-top.csv admin adminpassword

# 少し待つ（Moodleが処理するまで）
sleep 3

# ステップ2: サブカテゴリ
echo "ステップ2: サブカテゴリを作成"
node upload-categories.js categories-sub.csv admin adminpassword

echo "完了！"
```

実行:
```bash
chmod +x categories-batch.sh
./categories-batch.sh
```

---

## 📊 パフォーマンス

| カテゴリ数 | 実行時間（目安） |
|-----------|----------------|
| 1-10件 | 5-10秒 |
| 11-50件 | 10-30秒 |
| 51-100件 | 30-60秒 |
| 100件以上 | 1-2分 |

**推奨**: 大量のカテゴリを作成する場合は、50件ずつに分割してアップロード

---

## 🔒 セキュリティ

### パスワードの取り扱い

コマンドラインに直接パスワードを入力すると、シェル履歴に残る可能性があります。

**対策1**: 環境変数を使用

```bash
export MOODLE_USERNAME=admin
export MOODLE_PASSWORD=your_password

node upload-categories.js categories.csv $MOODLE_USERNAME $MOODLE_PASSWORD

# 終了後に削除
unset MOODLE_USERNAME
unset MOODLE_PASSWORD
```

**対策2**: スクリプトでパスワード入力

```bash
#!/bin/bash
echo -n "ユーザー名: "
read USERNAME
echo -n "パスワード: "
read -s PASSWORD
echo

node upload-categories.js categories.csv $USERNAME $PASSWORD
```

---

## ✅ チェックリスト

カテゴリアップロード前:
- [ ] BFFサーバーが起動している
- [ ] CSVファイルがUTF-8で保存されている
- [ ] 管理者アカウント情報を確認済み
- [ ] トップレベルカテゴリを先に作成する計画

カテゴリアップロード後:
- [ ] カテゴリが正しく作成された
- [ ] カテゴリIDをメモした
- [ ] 階層構造が正しい
- [ ] コースCSVを更新する準備ができた

---

## 🔗 関連ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `MOODLE_CATEGORY_UPLOAD_GUIDE.md` | カテゴリCSVフォーマット完全ガイド |
| `MOODLE_CSV_GUIDE.md` | コースアップロードガイド |
| `README.md` | プロジェクト概要 |

---

## ❓ よくある質問

### Q1: GUIとCLIの違いは？

**A**: 機能は同じです。GUIがない場合やバッチ処理にはCLIが便利です。

### Q2: 一度に何件まで作成できますか？

**A**: 制限はありませんが、安定性のため50件ずつ推奨します。

### Q3: 作成したカテゴリを削除できますか？

**A**: はい、Moodle管理画面から削除できます。CLIでの削除機能は今後追加予定です。

### Q4: エラーが出た場合、一部のカテゴリは作成されますか？

**A**: はい、エラー前に作成されたカテゴリは残ります。スクリプトは中断されますが、既に作成されたデータは保持されます。

---

## 次のステップ

カテゴリアップロード完了後:

1. ✅ カテゴリIDをメモ
2. ✅ `moodle-course-upload-template.csv` の `category` 列を更新
3. ✅ コースをアップロード（`MOODLE_CSV_GUIDE.md` 参照）

---

## サポート

問題が解決しない場合:
1. BFFサーバーのログを確認: `cd bff-server && npm start`
2. Moodleのログを確認
3. スクリプトをデバッグモードで実行: `DEBUG=true node upload-categories.js ...`
