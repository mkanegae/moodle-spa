"""
Course access endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dto.request import CourseAccessCreate
from dto.response import CourseAccessResponse, LastAccessedCourse
import crud

router = APIRouter(prefix="/api", tags=["Course Access"])


@router.post(
    "/course-access",
    response_model=CourseAccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="コースアクセスを記録"
)
def record_course_access(
    data: CourseAccessCreate,
    db: Session = Depends(get_db)
):
    """
    ユーザーのコースアクセスを記録します。
    既存のレコードがある場合は、アクセス回数と最終アクセス時刻を更新します。

    Args:
        data: ユーザーIDとコースID

    Returns:
        作成または更新されたアクセス記録
    """
    try:
        result = crud.record_course_access(db, data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record course access: {str(e)}"
        )


@router.get(
    "/users/{userid}/last-courses",
    response_model=List[LastAccessedCourse],
    summary="最終アクセスコース一覧を取得"
)
def get_last_accessed_courses(
    userid: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    ユーザーの最終アクセスコース一覧を取得します（新しい順）。

    Args:
        userid: ユーザーID
        limit: 取得件数（デフォルト: 10）

    Returns:
        最終アクセスコース一覧（コース情報付き）
    """
    try:
        courses = crud.get_user_last_accessed_courses(db, userid, limit)
        return courses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get last accessed courses: {str(e)}"
        )


@router.get(
    "/users/{userid}/most-accessed-courses",
    response_model=List[dict],
    summary="最もアクセスの多いコース一覧を取得"
)
def get_most_accessed_courses(
    userid: int,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    ユーザーの最もアクセスの多いコース一覧を取得します。

    Args:
        userid: ユーザーID
        limit: 取得件数（デフォルト: 5）

    Returns:
        アクセス回数の多い順のコース一覧
    """
    try:
        courses = crud.get_most_accessed_courses(db, userid, limit)
        return courses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get most accessed courses: {str(e)}"
        )
