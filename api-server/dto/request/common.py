"""
Common request DTOs
"""
from typing import List, Dict, Any
from pydantic import BaseModel, Field


class BulkUploadRequest(BaseModel):
    """一括アップロードリクエスト"""
    data_type: str = Field(..., pattern="^(users|courses|enrollments|categories)$", description="データタイプ")
    records: List[Dict[str, Any]] = Field(..., description="アップロードするレコード一覧")
