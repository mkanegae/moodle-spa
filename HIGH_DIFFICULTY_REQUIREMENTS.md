# 高難易度要件リスト

本ドキュメントは、LMSビジネス要求から抽出した技術的難易度の高い要件をまとめたものです。

---

## 1. ゲーミフィケーション機能（マイページ）

### 1.1 ユーザーレベル・経験値システム

**難易度**: 高
**工数見積**: 1.5人月

#### 要件
- 学習活動（レッスン完了、課題提出、バッジ獲得）に基づいて経験値（XP）を自動計算
- レベルアップ時のアニメーション表示
- 次のレベルまでの進捗をプログレスバーで可視化

#### 技術的課題
- **経験値計算ロジックの設計**
  - 活動の種類ごとの重み付け
  - レベルカーブの設計（線形 vs 指数関数）
  - バランス調整のための柔軟な設定

- **リアルタイム更新**
  - WebSocketまたはServer-Sent Eventsでのプッシュ通知
  - フロントエンドでの楽観的UI更新

- **データ整合性**
  - トランザクション処理（レッスン完了 + XP付与）
  - 重複計算の防止

#### データ設計
```sql
-- カスタムテーブル例
CREATE TABLE mdl_custom_user_xp (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userid BIGINT NOT NULL,
  total_xp INT DEFAULT 0,
  current_level INT DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_userid (userid)
);

CREATE TABLE mdl_custom_xp_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userid BIGINT NOT NULL,
  activity_type VARCHAR(50), -- 'lesson_complete', 'badge_earned', 'assignment_submit'
  activity_id BIGINT,
  xp_earned INT,
  created_at TIMESTAMP,
  INDEX idx_userid_created (userid, created_at)
);
```

---

### 1.2 バッジシステム・レコメンデーション

**難易度**: 高
**工数見積**: 2.0人月

#### 要件
- 獲得済みバッジの表示（最大3個をマイページに表示）
- 次に獲得できるバッジの自動レコメンド（Next Badge）
- バッジから逆引きでコースを発見できる機能

#### 技術的課題
- **バッジレコメンドアルゴリズム**
  - 現在の学習進捗から「あと少しで獲得できるバッジ」を計算
  - ユーザーの学習傾向に基づいたパーソナライズ
  - Phase 2ではAI活用による最適化

- **バッジメタデータ管理**
  - 獲得条件の柔軟な定義（JSON Schema等）
  - 複数条件の組み合わせ（AND/OR条件）

- **パフォーマンス最適化**
  - バッジ獲得状況のキャッシュ
  - 定期的なバッチ処理での再計算

#### 実装例（レコメンドロジック）
```python
# FastAPI実装例
async def recommend_next_badges(user_id: int, limit: int = 3):
    # ユーザーの学習進捗を取得
    progress = await db.get_user_progress(user_id)

    # すべてのバッジ定義を取得
    all_badges = await db.get_all_badge_definitions()

    # 未獲得バッジのみフィルタ
    earned_badges = await db.get_earned_badges(user_id)
    unearned = [b for b in all_badges if b.id not in earned_badges]

    # 各バッジの「獲得までの距離」を計算
    scored_badges = []
    for badge in unearned:
        completion_rate = calculate_badge_progress(badge, progress)
        scored_badges.append({
            "badge": badge,
            "completion_rate": completion_rate  # 0.0 ~ 1.0
        })

    # 完了率が高い順にソート
    scored_badges.sort(key=lambda x: x["completion_rate"], reverse=True)

    return scored_badges[:limit]
```

---

## 2. AI機能（学習プレイヤー画面）

### 2.1 文脈理解AIチャット（RAG構成）

**難易度**: 最高
**工数見積**: 2.5人月

#### 要件
- 現在閲覧中のレッスン内容を理解した上での質疑応答
- ユーザーの学習履歴・直近のアウトプットを考慮した回答
- チャット履歴の永続化とセッション管理

#### 技術的課題
- **RAG（Retrieval-Augmented Generation）の構築**
  - レッスンコンテンツのベクトル化（Embeddings）
  - ベクトルDBへの保存（ChromaDB, Pinecone, Weaviate等）
  - 類似度検索による関連コンテンツの取得

- **コンテキスト統合**
  - 現在のレッスンテキスト（最大4,000トークン）
  - ユーザーの直近10件のチャット履歴
  - 学習進捗データ（完了済みレッスン、課題提出状況）
  - これらをLLMのプロンプトに効果的に組み込む

- **レスポンス速度**
  - ストリーミングレスポンス（Server-Sent Events）
  - ベクトル検索の高速化（インデックス最適化）
  - LLM APIコールのキャッシュ戦略

#### アーキテクチャ
```
User Query
    ↓
FastAPI AI Service
    ↓
┌─────────────────────────────────────┐
│ 1. コンテキスト収集                │
│   - 現在のレッスンID取得            │
│   - DB: 学習履歴・課題提出状況     │
│   - DB: チャット履歴               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. ベクトル検索 (RAG)              │
│   - クエリのEmbedding生成          │
│   - Vector DB: 類似レッスン検索    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. プロンプト構築                  │
│   - System: コーチングの役割定義   │
│   - Context: レッスン+履歴+進捗    │
│   - User: ユーザーの質問           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. LLM API呼び出し                 │
│   - OpenAI / Claude API            │
│   - Streaming Response             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 5. 履歴保存                        │
│   - DB: チャット履歴保存           │
└─────────────────────────────────────┘
    ↓
Response to User
```

#### データベース設計
```sql
CREATE TABLE mdl_custom_ai_chat_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userid BIGINT NOT NULL,
  lessonid BIGINT,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSON, -- RAGで使用したコンテキスト情報
  embedding_used BOOLEAN DEFAULT FALSE,
  tokens_used INT,
  timecreated TIMESTAMP,
  INDEX idx_user_lesson (userid, lessonid),
  INDEX idx_timecreated (timecreated)
);
```

#### 実装例（FastAPI）
```python
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage

class AIContextService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = Chroma(
            persist_directory="./chroma_db",
            embedding_function=self.embeddings
        )
        self.llm = ChatOpenAI(model="gpt-4", streaming=True)

    async def get_contextualized_response(
        self,
        user_id: int,
        lesson_id: int,
        message: str
    ):
        # 1. 学習コンテキスト取得
        context = await self._build_context(user_id, lesson_id)

        # 2. ベクトル検索（RAG）
        relevant_docs = self.vectorstore.similarity_search(
            message,
            k=3,
            filter={"lesson_id": lesson_id}
        )

        # 3. プロンプト構築
        system_prompt = f"""
あなたは学習支援AIコーチです。
現在のレッスン: {context['current_lesson']['title']}
ユーザーの進捗: {context['progress']['completed_lessons']}個のレッスン完了

以下の関連情報を参考に、ユーザーの質問に答えてください：
{self._format_docs(relevant_docs)}
"""

        messages = [
            SystemMessage(content=system_prompt),
            *self._format_chat_history(context['chat_history']),
            HumanMessage(content=message)
        ]

        # 4. ストリーミングレスポンス
        async for chunk in self.llm.astream(messages):
            yield chunk.content

        # 5. 履歴保存（非同期で実行）
        await self._save_chat_history(user_id, lesson_id, message, response, context)

    async def _build_context(self, user_id: int, lesson_id: int):
        # DB並列取得
        current_lesson, progress, chat_history = await asyncio.gather(
            db.get_lesson(lesson_id),
            db.get_user_progress(user_id),
            db.get_chat_history(user_id, limit=10)
        )

        return {
            "current_lesson": current_lesson,
            "progress": progress,
            "chat_history": chat_history
        }
```

---

### 2.2 Slack統合（課題提出・ピアラーニング）

**難易度**: 中〜高
**工数見積**: 1.0人月

#### 要件
- レッスン内の「課題を提出する」ボタンからSlackチャンネルへ直接投稿
- 受講生同士の相互刺激を促すコミュニティ形成

#### 技術的課題
- **Slack OAuth認証**
  - ユーザーごとのSlackアカウント連携
  - アクセストークンの安全な保存

- **Slack API統合**
  - メッセージ投稿（chat.postMessage）
  - ファイルアップロード（files.upload）
  - スレッド作成

- **ディープリンク**
  - Slackから該当レッスンへ戻るリンク生成
  - LMS内でのSlack投稿追跡

#### データベース設計
```sql
CREATE TABLE mdl_custom_slack_integration (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userid BIGINT NOT NULL,
  slack_user_id VARCHAR(50),
  slack_team_id VARCHAR(50),
  access_token TEXT, -- 暗号化必須
  channel_id VARCHAR(50),
  created_at TIMESTAMP,
  UNIQUE KEY unique_user_slack (userid, slack_team_id)
);

CREATE TABLE mdl_custom_assignment_slack_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userid BIGINT NOT NULL,
  lessonid BIGINT NOT NULL,
  assignmentid BIGINT NOT NULL,
  slack_message_ts VARCHAR(50), -- Slackメッセージのタイムスタンプ
  slack_channel VARCHAR(50),
  posted_at TIMESTAMP,
  INDEX idx_user_lesson (userid, lessonid)
);
```

---

## 3. 高度な検索・レコメンデーション（コース一覧画面）

### 3.1 タグベースのコースレコメンド

**難易度**: 中〜高
**工数見積**: 0.8人月

#### 要件
- ユーザーの学習履歴から類似タグを持つコースを自動推薦
- 「このコースを受講したユーザーは、こちらも受講しています」機能

#### 技術的課題
- **協調フィルタリング**
  - ユーザー×コース行列の構築
  - コサイン類似度による類似ユーザー発見

- **コンテンツベースフィルタリング**
  - コースのタグ・カテゴリベクトル化
  - TF-IDFまたはEmbeddingsでの類似度計算

- **ハイブリッドアプローチ**
  - 協調フィルタリング + コンテンツベースの重み付け統合

#### 実装例（SQL）
```sql
-- タグベースのレコメンド（Moodle DB直接アクセス）
SELECT
  c.id,
  c.fullname,
  c.summary,
  COUNT(DISTINCT t.id) as matching_tags,
  AVG(CASE WHEN cc.timecompleted IS NOT NULL THEN 1 ELSE 0 END) as completion_rate
FROM mdl_course c
INNER JOIN mdl_tag_instance ti ON ti.itemid = c.id AND ti.itemtype = 'course'
INNER JOIN mdl_tag t ON t.id = ti.tagid
WHERE t.id IN (
  -- ユーザーが過去に受講したコースのタグ
  SELECT DISTINCT t2.id
  FROM mdl_user_enrolments ue
  INNER JOIN mdl_enrol e ON e.id = ue.enrolid
  INNER JOIN mdl_tag_instance ti2 ON ti2.itemid = e.courseid AND ti2.itemtype = 'course'
  INNER JOIN mdl_tag t2 ON t2.id = ti2.tagid
  WHERE ue.userid = :user_id
)
AND c.id NOT IN (
  -- 既に受講中のコースを除外
  SELECT e2.courseid
  FROM mdl_user_enrolments ue2
  INNER JOIN mdl_enrol e2 ON e2.id = ue2.enrolid
  WHERE ue2.userid = :user_id
)
LEFT JOIN mdl_course_completions cc ON cc.course = c.id
GROUP BY c.id
ORDER BY matching_tags DESC, completion_rate DESC
LIMIT 10;
```

---

### 3.2 フィルタリング・絞り込み機能

**難易度**: 中
**工数見積**: 0.5人月

#### 要件
- カテゴリ、タグ、難易度、所要時間での複数条件フィルタ
- フィルタ選択時のリアルタイム結果更新（Ajax）
- フィルタ状態のURL永続化（シェア可能）

#### 技術的課題
- **クエリパフォーマンス**
  - 複数条件のINDEX最適化
  - 全文検索エンジン統合（Elasticsearch等）の検討

- **UI/UX**
  - フィルタ選択の組み合わせ爆発への対応
  - 「該当なし」状態の適切な表示

---

## 4. Phase 2拡張機能（将来実装）

### 4.1 バッジレコメンドの自動最適化（AI活用）

**難易度**: 最高
**工数見積**: 2.0人月以上

#### 要件
- 強化学習によるバッジ提示順序の最適化
- ABテストによる効果測定

#### 技術的課題
- MLOpsパイプライン構築
- A/Bテストフレームワーク統合
- メトリクス収集・分析基盤

---

### 4.2 運営バナーのA/Bテスト機能

**難易度**: 中
**工数見積**: 1.0人月

#### 要件
- 複数バナーパターンの同時配信
- クリック率・コンバージョン率の自動集計
- 統計的有意性の判定

#### データベース設計
```sql
CREATE TABLE mdl_custom_ab_test_campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_name VARCHAR(100),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status ENUM('draft', 'running', 'paused', 'completed'),
  created_at TIMESTAMP
);

CREATE TABLE mdl_custom_ab_test_variants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT,
  variant_name VARCHAR(50), -- 'A', 'B', 'C'
  banner_image_url TEXT,
  banner_link_url TEXT,
  weight INT DEFAULT 100, -- トラフィック配分
  FOREIGN KEY (campaign_id) REFERENCES mdl_custom_ab_test_campaigns(id)
);

CREATE TABLE mdl_custom_ab_test_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT,
  variant_id BIGINT,
  userid BIGINT,
  event_type ENUM('impression', 'click', 'conversion'),
  created_at TIMESTAMP,
  INDEX idx_campaign_variant (campaign_id, variant_id),
  INDEX idx_created (created_at)
);
```

---

## 5. 技術スタック推奨構成

### フロントエンド
- React + TypeScript
- TailwindCSS（SHElikes風デザイン）
- React Query（サーバー状態管理）
- Framer Motion（アニメーション）

### バックエンド
- **BFF**: Node.js + Express（既存）
- **AI/DB API**: Python + FastAPI
  - LangChain（RAG構築）
  - SQLAlchemy（DB ORM）
  - ChromaDB / Pinecone（ベクトルDB）

### データベース
- **Moodle DB**: MySQL/PostgreSQL（読み取り専用＋カスタムテーブル書き込み）
- **Redis**: セッション・キャッシュ
- **Vector DB**: ChromaDB（開発）/ Pinecone（本番）

### インフラ
- Docker + Docker Compose（開発環境）
- AWS / GCP（本番環境）
  - ECS/Cloud Run（コンテナ）
  - RDS（DB）
  - ElastiCache（Redis）

---

## 6. リスク・課題

### 6.1 Moodle DBへの依存
- **リスク**: Moodleアップデートによるテーブル構造変更
- **対策**:
  - カスタムテーブルのみ書き込み可能に制限
  - Moodle標準APIとDB APIの併用でリスク分散

### 6.2 AI APIコスト
- **リスク**: ユーザー増加によるOpenAI/Claude APIコスト高騰
- **対策**:
  - キャッシュ戦略（同一質問の再利用）
  - トークン数制限
  - コスト監視アラート設定

### 6.3 パフォーマンス
- **リスク**: ユーザー増加時のレスポンス遅延
- **対策**:
  - DB接続プール最適化
  - CDN導入（静的アセット）
  - バックグラウンドジョブ化（重い処理）

---

## 7. 優先順位付け（MoSCoW法）

### Must Have（必須）
- ユーザーレベル・経験値システム
- 「続きから始める」ロジック
- 文脈理解AIチャット（基本版）
- タグベースコースレコメンド

### Should Have（重要）
- バッジシステム・レコメンド
- Slack統合
- フィルタリング機能

### Could Have（あれば良い）
- RAG高度化（複数ドキュメント横断検索）
- A/Bテスト機能

### Won't Have（Phase 2以降）
- AI自動最適化（強化学習）
- リアルタイム通知（WebSocket）

---

## 8. まとめ

最も技術的難易度が高い要件は以下の3つ：

1. **文脈理解AIチャット（RAG構成）** - 2.5人月
2. **バッジシステム・レコメンデーション** - 2.0人月
3. **ユーザーレベル・経験値システム** - 1.5人月

**合計見積**: 約6.0人月（開発+UT）

これらの機能を実現するには、**FastAPIでのAI/DB API統合が必須**です。
