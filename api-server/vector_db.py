"""
Vector Database Abstraction Layer
ChromaDB (test) and Aurora pgvector (production)
"""
import os
import logging
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod

import chromadb

logger = logging.getLogger(__name__)


class VectorDBRetriever(ABC):
    """ベクトルDBリトリーバーの抽象基底クラス"""

    @abstractmethod
    def search(
        self,
        query: str,
        n_results: int = 5,
        course_id: Optional[int] = None,
        module_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        ベクトル検索を実行

        Args:
            query: 検索クエリ
            n_results: 取得する結果数
            course_id: コースIDでフィルタ
            module_name: モジュール名でフィルタ

        Returns:
            検索結果（documents, metadatas, distances）
        """
        pass

    @abstractmethod
    def get_document_count(self) -> int:
        """ドキュメント総数を取得"""
        pass


class ChromaDBRetriever(VectorDBRetriever):
    """ChromaDB リトリーバー（テスト環境）"""

    def __init__(self, chromadb_path: str = None, collection_name: str = "moodle_resources"):
        """
        ChromaDB リトリーバーを初期化

        Args:
            chromadb_path: ChromaDBのパス
            collection_name: コレクション名
        """
        self.chromadb_path = chromadb_path or os.getenv('CHROMADB_PATH', '/app/chromadb')
        self.collection_name = collection_name
        self.client = None
        self.collection = None

        try:
            logger.info(f"Connecting to ChromaDB at {self.chromadb_path}")
            self.client = chromadb.PersistentClient(path=self.chromadb_path)
            self.collection = self.client.get_collection(name=self.collection_name)
            logger.info(f"ChromaDB connected. Total documents: {self.collection.count()}")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            raise

    def search(
        self,
        query: str,
        n_results: int = 5,
        course_id: Optional[int] = None,
        module_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """ChromaDBでベクトル検索"""
        if not self.collection:
            raise RuntimeError("ChromaDB collection not initialized")

        # フィルタ条件を構築
        where_filter = None
        if course_id is not None and module_name is not None:
            where_filter = {
                "$and": [
                    {"course_id": course_id},
                    {"module_name": module_name}
                ]
            }
        elif course_id is not None:
            where_filter = {"course_id": course_id}
        elif module_name is not None:
            where_filter = {"module_name": module_name}

        logger.info(f"ChromaDB search: query='{query}', filter={where_filter}, n_results={n_results}")

        # ベクトル検索実行
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        return results

    def get_document_count(self) -> int:
        """ChromaDBのドキュメント総数を取得"""
        if not self.collection:
            return 0
        return self.collection.count()


class AuroraPgvectorRetriever(VectorDBRetriever):
    """Aurora pgvector リトリーバー（本番環境）"""

    def __init__(self, db_session=None):
        """
        Aurora pgvector リトリーバーを初期化

        Args:
            db_session: SQLAlchemyのDBセッション
        """
        self.db_session = db_session
        logger.info("Aurora pgvector retriever initialized (stub implementation)")

    def search(
        self,
        query: str,
        n_results: int = 5,
        course_id: Optional[int] = None,
        module_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Aurora pgvectorでベクトル検索（空実装）

        Note: 本番環境では、以下の実装が必要:
        1. SQLAlchemyモデルでpgvector型のembeddingカラムを定義
        2. text-embedding-3-small等で埋め込みベクトル生成
        3. pgvectorの<=>演算子でコサイン類似度検索
        4. WHEREでcourse_id, module_nameフィルタ
        """
        logger.warning("Aurora pgvector search is not implemented yet (stub)")

        # TODO: 本番実装
        # from sqlalchemy import text
        # query_embedding = generate_embedding(query)  # 埋め込み生成
        # sql = text("""
        #     SELECT id, content, metadata,
        #            1 - (embedding <=> :query_embedding) as similarity
        #     FROM course_embeddings
        #     WHERE course_id = :course_id
        #     ORDER BY embedding <=> :query_embedding
        #     LIMIT :limit
        # """)
        # results = self.db_session.execute(
        #     sql,
        #     {"query_embedding": query_embedding, "course_id": course_id, "limit": n_results}
        # ).fetchall()

        # 空の結果を返す
        return {
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]]
        }

    def get_document_count(self) -> int:
        """Aurora pgvectorのドキュメント総数を取得（空実装）"""
        logger.warning("Aurora pgvector document count is not implemented yet (stub)")
        return 0


def get_vector_db_retriever(environment: str = None, db_session=None) -> VectorDBRetriever:
    """
    環境に応じたベクトルDBリトリーバーを取得

    Args:
        environment: 実行環境（"test", "production", None=環境変数から判定）
        db_session: DBセッション（Aurora pgvector用）

    Returns:
        VectorDBRetriever: 適切なリトリーバー実装
    """
    if environment is None:
        environment = os.getenv("VECTOR_DB_ENV", "test")

    logger.info(f"Initializing vector DB retriever for environment: {environment}")

    if environment == "production":
        return AuroraPgvectorRetriever(db_session=db_session)
    else:
        return ChromaDBRetriever()
