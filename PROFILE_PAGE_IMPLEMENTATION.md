# プロフィール編集ページ実装ガイド

## 概要

ユーザーがプロフィール情報を編集できる専用ページを実装しました。

## 実装内容

### 1. 作成したファイル

```
frontend/src/
├── components/
│   └── ProfilePage.tsx          # プロフィール編集ページコンポーネント
├── types/
│   └── profile.ts               # プロフィール設定の型定義
└── routes/
    └── index.tsx                # ルーティング設定（更新）
```

### 2. 主な機能

#### プロフィール編集画面の構成

```
┌─────────────────────────────────────────────────┐
│  WEBCOACH                         🔔  👤        │
├─────────────────────────────────────────────────┤
│  ホーム > プロフィール設定                       │
│                                                 │
│  PROFILE                                        │
│  あなたの「なりたい姿」を言葉にしましょう        │
│                                                 │
│  ┌──────────┐  ┌────────────────────────────┐  │
│  │          │  │  基本情報                   │  │
│  │プロフィー│  │  ┌─────────────────────┐  │  │
│  │ル編集    │  │  │ 📷                    │  │  │
│  │          │  │  │ 表示名               │  │  │
│  │アカウント│  │  └─────────────────────┘  │  │
│  │設定      │  │  ┌─────────────────────┐  │  │
│  │          │  │  │ 自己紹介（140文字） │  │  │
│  │通知設定  │  │  └─────────────────────┘  │  │
│  │          │  │                            │  │
│  │お支払い  │  │  未来のあなた設定          │  │
│  │情報      │  │  ┌─────────────────────┐  │  │
│  │          │  │  │ なりたい職種         │  │  │
│  └──────────┘  │  └─────────────────────┘  │  │
│                 │  ┌─────────────────────┐  │  │
│                 │  │ 理想の働き方         │  │  │
│                 │  └─────────────────────┘  │  │
│                 │                            │  │
│                 │      ┌──────────┐         │  │
│                 │      │変更を保存│         │  │
│                 │      └──────────┘         │  │
│                 └────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### タブ構成

1. **プロフィール編集** (実装済み)
   - プロフィール画像
   - 表示名（ニックネーム）
   - 自己紹介（140文字制限）
   - なりたい職種・職務
   - 理想の働き方

2. **アカウント設定** (未実装 - プレースホルダー)
3. **通知設定** (未実装 - プレースホルダー)
4. **お支払い情報** (未実装 - プレースホルダー)

### 3. データフロー

```
ProfilePage.tsx
    ↓ HTTP GET /api/profile-settings?auto_create=true
BFF Server (index.js:538)
    ↓ HTTP GET /api/users/{userid}/profile-settings
FastAPI Server (main.py)
    ↓ SQL Query
Moodle Database (mdl_user_profile_settings)
```

#### 保存時のフロー

```
ProfilePage.tsx
    ↓ HTTP PUT /api/profile-settings
BFF Server (index.js:596)
    ↓ HTTP PUT /api/users/{userid}/profile-settings
FastAPI Server (main.py)
    ↓ SQL UPDATE
Moodle Database (mdl_user_profile_settings)
```

### 4. 型定義

#### ProfileSettings

```typescript
interface ProfileSettings {
  id?: number;
  userid: number;
  theme: 'light' | 'dark';
  language: 'ja' | 'en';
  notifications_enabled: boolean;
  email_notifications: boolean;
  timezone: string;
  items_per_page: number;
  avatar_url: string | null;
  bio: string | null;
  preferences: ProfilePreferences | null;
  timemodified?: number;
  timecreated?: number;
}
```

#### ProfilePreferences

```typescript
interface ProfilePreferences {
  nickname?: string;
  career_goal?: string;      // なりたい職種
  work_style_goal?: string;  // 理想の働き方
  custom_settings?: Record<string, any>;
}
```

### 5. API エンドポイント

#### プロフィール設定を取得

```http
GET /api/profile-settings?auto_create=true
```

**レスポンス例:**
```json
{
  "id": 1,
  "userid": 456,
  "theme": "light",
  "language": "ja",
  "bio": "未経験からWebデザイナーを目指している高橋ハナコです！",
  "avatar_url": null,
  "preferences": {
    "nickname": "Webデザイナー志望のハナコ",
    "career_goal": "売れっ子Webデザイナー",
    "work_style_goal": "カフェで自由に働く"
  },
  "timemodified": 1701234567,
  "timecreated": 1701230000
}
```

#### プロフィール設定を更新

```http
PUT /api/profile-settings
Content-Type: application/json

{
  "bio": "更新された自己紹介",
  "preferences": {
    "nickname": "新しいニックネーム",
    "career_goal": "更新された目標",
    "work_style_goal": "更新された働き方"
  }
}
```

### 6. 画面遷移

```
MyPage.tsx
    ↓ クリック: 「プロフィール編集」ボタン
    ↓ navigate('/profile')
ProfilePage.tsx
    ↓ クリック: 「WEBCOACH」ロゴ
    ↓ navigate('/mypage')
MyPage.tsx
```

### 7. ルーティング設定

`frontend/src/routes/index.tsx`に以下を追加:

```typescript
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <ProfilePageWrapper />
    </ProtectedRoute>
  }
/>
```

## 使用方法

### 1. マイページからプロフィール編集へ移動

1. `/mypage`にアクセス
2. 左サイドバーの「プロフィール編集」ボタンをクリック
3. `/profile`に遷移

### 2. プロフィール情報の編集

1. **表示名**: ニックネームを入力（マイページに表示されます）
2. **自己紹介**: 140文字以内で自己紹介を記入
3. **なりたい職種**: キャリアゴールを入力
4. **理想の働き方**: ワークスタイルの目標を入力

### 3. 変更を保存

1. すべての入力が完了したら「変更を保存する」ボタンをクリック
2. 成功メッセージが表示されます
3. プロフィール情報が`mdl_user_profile_settings`テーブルに保存されます

## デザイン仕様

### カラーパレット

- **プライマリーカラー**: `#F3A7A7` (ピンク)
- **アクティブタブ背景**: `#FCE7F3` (薄いピンク)
- **セクション背景**: `#FFF9F5` (薄いオレンジ - 未来のあなた設定)
- **保存ボタン**: `#2D3748` (ダークネイビー)

### タイポグラフィ

- **フォント**: Noto Sans JP, Noto Serif JP
- **見出し**: 18-24px, Bold
- **本文**: 14px, Regular
- **ラベル**: 14px, Medium

### レイアウト

- **最大幅**: 1200px
- **グリッド**: 2カラム（280px + 1fr）
- **余白**: 8px単位（Tailwind spacing）
- **角丸**: 12px (rounded-xl)

## 拡張可能性

### 今後実装予定の機能

1. **アカウント設定タブ**
   - メールアドレス変更
   - パスワード変更
   - アカウント削除

2. **通知設定タブ**
   - プッシュ通知設定
   - メール通知設定
   - 通知頻度設定

3. **お支払い情報タブ**
   - クレジットカード登録
   - 請求履歴
   - プラン変更

4. **プロフィール画像アップロード**
   - ファイル選択
   - 画像クロップ
   - 画像アップロードAPI

### 拡張方法

新しいタブを追加する場合:

1. `ProfileTab`型に新しいタブを追加:
   ```typescript
   export type ProfileTab = 'profile' | 'account' | 'notifications' | 'payment' | 'new-tab';
   ```

2. `ProfilePage.tsx`にタブボタンを追加:
   ```tsx
   <button
     onClick={() => setActiveTab('new-tab')}
     className={...}
   >
     新しいタブ
   </button>
   ```

3. タブコンテンツを実装:
   ```tsx
   {activeTab === 'new-tab' && (
     <section>
       {/* 新しいタブの内容 */}
     </section>
   )}
   ```

## トラブルシューティング

### プロフィールが読み込めない

**原因**: FastAPIサーバーが起動していない、またはBFFとの接続エラー

**解決方法**:
```bash
# FastAPIサーバーが起動しているか確認
curl http://localhost:8001/health

# BFFサーバーが起動しているか確認
curl http://localhost:3001/health
```

### 保存ボタンが反応しない

**原因**: 認証セッションが切れている

**解決方法**:
1. ブラウザの開発者ツールでネットワークタブを確認
2. 401エラーの場合は再ログイン
3. Cookie設定を確認

### 文字数制限が機能しない

**原因**: `maxLength`属性とスライス処理が正しく動作していない

**確認箇所**: `ProfilePage.tsx:331`
```typescript
onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 140))}
```

## まとめ

プロフィール編集ページの実装により、以下が可能になりました：

✅ ユーザーがニックネームを設定できる
✅ 自己紹介を140文字以内で記入できる
✅ キャリアゴール（なりたい職種）を設定できる
✅ ワークスタイルの目標を設定できる
✅ マイページから簡単にアクセスできる
✅ 変更内容がデータベースに永続化される

将来的には、アカウント設定・通知設定・支払い情報などの機能を追加予定です。
