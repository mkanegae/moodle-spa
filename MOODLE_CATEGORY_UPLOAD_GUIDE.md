# Moodleカテゴリ一括登録CSV ガイド

## 重要: カテゴリは必ずコースより先に作成してください

コースをアップロードする前に、まずカテゴリを作成する必要があります。
コースCSVで指定する `category` フィールドには、作成済みのカテゴリIDを使用します。

## CSVフォーマット説明

### 必須フィールド

| フィールド名 | 説明 | 例 |
|------------|------|-----|
| **name** | カテゴリの名前 | `必修科目` |
| **parent** | 親カテゴリID（0=トップレベル） | `0` または `1` |

### 推奨フィールド

| フィールド名 | 説明 | 例 |
|------------|------|-----|
| **idnumber** | カテゴリID番号（管理用） | `CAT-REQUIRED` |
| **description** | カテゴリの説明 | `必修科目のカテゴリです` |
| **visible** | 表示/非表示 | `1` (表示), `0` (非表示) |

### その他の利用可能なフィールド

| フィールド名 | 説明 | 例 |
|------------|------|-----|
| **theme** | テーマ | `boost` |
| **sortorder** | 表示順序 | `1`, `2`, `3` |

## 階層構造の作成方法

### 1. トップレベルカテゴリを作成

最初に親カテゴリ（parent=0）を作成します：

```csv
name,parent,idnumber,description,visible
必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
選択科目,0,CAT-ELECTIVE,選択科目のカテゴリです,1
```

### 2. カテゴリIDを確認

アップロード後、Moodleで各カテゴリのIDを確認します：

1. **サイト管理 > コース > コースとカテゴリの管理** に移動
2. カテゴリをクリックし、URLの `categoryid=` パラメータで確認
   - 例: `必修科目` のID = 1、`選択科目` のID = 2

### 3. サブカテゴリを作成

親カテゴリのIDを使用してサブカテゴリを作成します：

```csv
name,parent,idnumber,description,visible
基礎教養,1,CAT-REQUIRED-GENERAL,基礎教養科目,1
専門基礎,1,CAT-REQUIRED-MAJOR,専門基礎科目,1
ビジネス系,2,CAT-ELECTIVE-BIZ,ビジネス関連の選択科目,1
IT系,2,CAT-ELECTIVE-IT,IT・プログラミング関連の選択科目,1
```

## 使用手順

### ステップ1: CSVファイルを準備

1. `moodle-category-upload-template.csv` をコピー
2. 必要に応じて編集
3. UTF-8（BOM付き）で保存

### ステップ2: Moodleにアップロード

1. Moodle管理画面にログイン
2. **サイト管理 > コース > カテゴリをアップロード** に移動
3. CSVファイルを選択してアップロード
4. プレビューを確認
5. 「カテゴリをアップロード」をクリック

### ステップ3: カテゴリIDを確認

アップロード後、必ず各カテゴリのIDを確認してメモします：

```
必修科目 (ID: 1)
├── 基礎教養 (ID: 3)
└── 専門基礎 (ID: 4)

選択科目 (ID: 2)
├── ビジネス系 (ID: 5)
├── IT系 (ID: 6)
└── 語学系 (ID: 7)

特別講座 (ID: 8)
```

### ステップ4: コースCSVを更新

確認したカテゴリIDを使用して、コースCSVの `category` フィールドを更新します：

```csv
shortname,fullname,category,summary,format,visible
MATH101,数学基礎コース,3,数学の基礎を学ぶ,topics,1
ENG201,ビジネス英語,5,ビジネス英語を学ぶ,topics,1
PROG301,プログラミング入門,6,Pythonを学ぶ,topics,1
```

## サンプルデータの説明

`moodle-category-upload-template.csv` には以下の階層構造が含まれています：

```
必修科目 (parent=0)
├── 基礎教養 (parent=1)
└── 専門基礎 (parent=1)

選択科目 (parent=0)
├── ビジネス系 (parent=2)
├── IT系 (parent=2)
└── 語学系 (parent=2)

特別講座 (parent=0)
```

**注意**: `parent` フィールドの数字は、テンプレートCSVの行番号ではなく、実際にMoodleで作成されたカテゴリIDです。

## 推奨ワークフロー

### 方法1: 段階的アップロード（推奨）

1. **トップレベルのみアップロード**
   ```csv
   name,parent,idnumber,description,visible
   必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
   選択科目,0,CAT-ELECTIVE,選択科目のカテゴリです,1
   特別講座,0,CAT-SPECIAL,特別講座・セミナー,1
   ```

2. **カテゴリIDを確認** (例: 必修科目=1, 選択科目=2, 特別講座=8)

3. **サブカテゴリをアップロード**
   ```csv
   name,parent,idnumber,description,visible
   基礎教養,1,CAT-REQUIRED-GENERAL,基礎教養科目,1
   専門基礎,1,CAT-REQUIRED-MAJOR,専門基礎科目,1
   ビジネス系,2,CAT-ELECTIVE-BIZ,ビジネス関連の選択科目,1
   IT系,2,CAT-ELECTIVE-IT,IT・プログラミング関連の選択科目,1
   語学系,2,CAT-ELECTIVE-LANG,語学関連の選択科目,1
   ```

### 方法2: 手動でカテゴリを作成

小規模な場合は、Moodleの管理画面で手動作成も可能です：

1. **サイト管理 > コース > コースとカテゴリの管理**
2. 「新しいカテゴリを追加」をクリック
3. カテゴリ名と説明を入力
4. 作成後、カテゴリIDを確認

## CSVファイルのエンコーディング

- **推奨**: UTF-8（BOM付き）
- 日本語を含む場合は必ずUTF-8で保存してください

### Excelで保存する場合の注意

Excelで保存すると文字化けする可能性があります。以下の方法を推奨：

1. **メモ帳/VSCodeで保存**: UTF-8エンコーディングを選択
2. **Google スプレッドシート**: CSVダウンロード時に自動的にUTF-8
3. **LibreOffice Calc**: 保存時に文字コードを選択可能

## トラブルシューティング

### エラー: "親カテゴリが見つかりません"

- `parent` フィールドに指定したIDが存在しない
- まずトップレベルカテゴリ（parent=0）を作成してから、サブカテゴリを作成

### エラー: "カテゴリ名が既に使用されています"

- 同じ親の下に同じ名前のカテゴリは作成できません
- 異なる親の下であれば、同じ名前でも作成可能

### 文字化けする

- CSVファイルのエンコーディングをUTF-8（BOM付き）で保存してください

### カテゴリが表示されない

- `visible` フィールドが `0` になっていないか確認
- 権限設定を確認

## カテゴリID確認の簡単な方法

### 方法1: URL確認

カテゴリをクリックした際のURLを確認：
```
https://your-moodle.com/course/management.php?categoryid=5
                                                        ↑
                                                     カテゴリID
```

### 方法2: データベースクエリ（管理者のみ）

```sql
SELECT id, name, parent, idnumber FROM mdl_course_categories ORDER BY sortorder;
```

### 方法3: カテゴリ一覧のエクスポート

1. **サイト管理 > コース > コースとカテゴリの管理**
2. カテゴリ一覧を表示
3. 各カテゴリのIDをメモ

## 完全な作業フロー例

### 1日目: カテゴリ作成

```bash
# 1. トップレベルカテゴリCSV作成
cat > categories-top.csv << 'EOF'
name,parent,idnumber,description,visible
必修科目,0,CAT-REQUIRED,必修科目のカテゴリです,1
選択科目,0,CAT-ELECTIVE,選択科目のカテゴリです,1
特別講座,0,CAT-SPECIAL,特別講座・セミナー,1
EOF

# 2. Moodleにアップロード（管理画面から）
# 3. IDを確認してメモ: 必修=1, 選択=2, 特別=8
```

### 2日目: サブカテゴリ作成

```bash
# 1. サブカテゴリCSV作成（確認したIDを使用）
cat > categories-sub.csv << 'EOF'
name,parent,idnumber,description,visible
基礎教養,1,CAT-REQUIRED-GENERAL,基礎教養科目,1
専門基礎,1,CAT-REQUIRED-MAJOR,専門基礎科目,1
ビジネス系,2,CAT-ELECTIVE-BIZ,ビジネス関連の選択科目,1
IT系,2,CAT-ELECTIVE-IT,IT・プログラミング関連の選択科目,1
語学系,2,CAT-ELECTIVE-LANG,語学関連の選択科目,1
EOF

# 2. Moodleにアップロード
# 3. IDを確認: 基礎教養=3, 専門基礎=4, ビジネス=5, IT=6, 語学=7
```

### 3日目: コース作成

```bash
# 確認したカテゴリIDを使用してコースCSVを作成
cat > courses.csv << 'EOF'
shortname,fullname,category,summary,format,visible
MATH101,数学基礎コース,3,数学の基礎を学ぶ,topics,1
ENG201,ビジネス英語,5,ビジネス英語を学ぶ,topics,1
PROG301,プログラミング入門,6,Pythonを学ぶ,topics,1
MGT401,プロジェクト管理,5,アジャイル開発を学ぶ,weeks,1
DATA501,データ分析基礎,6,データ分析とBIツール,topics,1
EOF

# Moodleにアップロード
```

## まとめ

1. **カテゴリを先に作成** - コースより先にカテゴリを作成
2. **IDを必ず確認** - アップロード後にカテゴリIDを確認
3. **段階的に作成** - トップレベル → サブカテゴリ → コースの順
4. **UTF-8で保存** - 日本語を使う場合は必須
5. **IDをメモ** - コースCSV作成時に必要
