"""
WebCoach specific endpoints (Resume courses, profiles, etc.)
"""
from typing import List
from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from dto.request import WebCoachUserProfileUpdate, ResumeCourseUpdate
from dto.response import WebCoachUserProfileResponse
import crud
from crud import (
    get_webcoach_user_profile,
    upsert_webcoach_user_profile,
    get_webcoach_resume_courses,
    upsert_webcoach_user_course_lastaccess,
    get_moodle_user_info,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["WebCoach"])


# ==========================================
# Resume Course Endpoints
# ==========================================

@router.get(
    "/users/{userid}/resume-courses",
    response_model=List[dict],
    summary="再開可能なコース取得"
)
def get_resume_courses(
    userid: int,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    ユーザーの再開可能なコース一覧を取得します。

    最後にアクセスしたコースで、まだ完了していないものを返します。

    Args:
        userid: ユーザーID
        limit: 取得件数（デフォルト: 5）

    Returns:
        再開可能なコース一覧
    """
    try:
        courses = crud.get_user_last_accessed_courses(db, userid, limit)

        # Transform to resume course format
        resume_courses = []
        for course in courses:
            resume_courses.append({
                "courseid": course.courseid,
                "fullname": course.course_fullname or f"Course {course.courseid}",
                "shortname": course.course_shortname or "",
                "summary": course.course_summary,
                "lastaccess": course.lastaccess,
                "progress": 0.0,  # TODO: Calculate actual progress from Moodle
                "accesscount": course.accesscount
            })

        return resume_courses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resume courses: {str(e)}"
        )


# ==========================================
# WebCoach User Profile Endpoints
# ==========================================

@router.get(
    "/webcoach/profile/{userid}",
    response_model=WebCoachUserProfileResponse,
    response_model_exclude_none=False,
    summary="WebCoachユーザープロフィール取得"
)
def get_webcoach_profile_endpoint(
    userid: int,
    db: Session = Depends(get_db)
):
    """
    WebCoachユーザープロフィールを取得します。

    Args:
        userid: ユーザーID (Moodle User ID)

    Returns:
        WebCoachUserProfile: プロフィール情報
    """
    try:
        profile = get_webcoach_user_profile(db, userid)

        if not profile:
            # プロフィールが存在しない場合は、空のプロフィールを返す
            return WebCoachUserProfileResponse(
                mdl_user_id=userid,
                nick_name=None,
                self_intro=None,
                target_job=None,
                ideal_work_style=None,
                monthly_goal=None,
                goal=None,
                badge_count=0
            )

        # Convert profile to dict
        profile_dict = {
            "mdl_user_id": profile.mdl_user_id,
            "nick_name": profile.nick_name,
            "self_intro": profile.self_intro,
            "target_job": profile.target_job,
            "ideal_work_style": profile.ideal_work_style,
            "monthly_goal": profile.monthly_goal,
            "goal": profile.goal,
            "badge_count": profile.badge_count
        }
        return WebCoachUserProfileResponse(**profile_dict)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get WebCoach profile: {str(e)}"
        )


@router.post(
    "/webcoach/profile/{userid}",
    response_model=WebCoachUserProfileResponse,
    summary="WebCoachユーザープロフィール更新"
)
def update_webcoach_profile_endpoint(
    userid: int,
    data: WebCoachUserProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    WebCoachユーザープロフィールを更新します。
    プロフィールが存在しない場合は新規作成します。

    Args:
        userid: ユーザーID (Moodle User ID)
        data: 更新するプロフィール情報

    Returns:
        WebCoachUserProfile: 更新されたプロフィール情報
    """
    try:
        # 更新データを辞書に変換
        update_dict = data.model_dump(exclude_unset=True)
        update_dict['mdl_user_id'] = userid

        # upsert実行
        profile = upsert_webcoach_user_profile(db, update_dict)
        db.commit()
        db.refresh(profile)

        return WebCoachUserProfileResponse.model_validate(profile)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update WebCoach profile: {str(e)}"
        )


# ==========================================
# Alias Endpoints (for compatibility)
# ==========================================

@router.get(
    "/profile/{userid}",
    response_model=WebCoachUserProfileResponse,
    response_model_exclude_none=False,
    summary="WebCoachプロフィール情報取得"
)
def get_profile_alias(userid: int, db: Session = Depends(get_db)):
    """
    WebCoachプロフィール情報取得
    BFF /api/webcoach/profile からの呼び出し用
    """
    profile = get_webcoach_user_profile(db, userid)

    if not profile:
        # プロフィールが存在しない場合は、空のプロフィールを返す
        return WebCoachUserProfileResponse(
            mdl_user_id=userid,
            nick_name=None,
            self_intro=None,
            target_job=None,
            ideal_work_style=None,
            monthly_goal=None,
            goal=None,
            badge_count=0
        )

    # Convert profile to dict
    profile_dict = {
        "mdl_user_id": profile.mdl_user_id,
        "nick_name": profile.nick_name,
        "self_intro": profile.self_intro,
        "target_job": profile.target_job,
        "ideal_work_style": profile.ideal_work_style,
        "monthly_goal": profile.monthly_goal,
        "goal": profile.goal,
        "badge_count": profile.badge_count
    }
    return WebCoachUserProfileResponse(**profile_dict)


@router.post(
    "/updateprofile/{userid}",
    response_model=WebCoachUserProfileResponse,
    summary="WebCoachプロフィール情報更新"
)
def update_profile_alias(userid: int, data: WebCoachUserProfileUpdate, db: Session = Depends(get_db)):
    """
    WebCoachプロフィール情報更新
    BFF /api/webcoach/updateprofile からの呼び出し用
    """
    try:
        # Convert data to dict and add mdl_user_id
        record = data.model_dump(exclude_unset=True)
        record['mdl_user_id'] = userid
        profile = upsert_webcoach_user_profile(db, record)
        db.commit()
        db.refresh(profile)
        return WebCoachUserProfileResponse.model_validate(profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update WebCoach profile: {str(e)}"
        )


@router.get(
    "/resumecourse/{userid}",
    response_model=List[dict],
    summary="コース再開情報取得（エイリアス）"
)
def get_resume_course_alias(userid: int, db: Session = Depends(get_db)):
    """
    コース再開情報取得のエイリアスエンドポイント
    webcoach_user_course_lastaccess テーブルから取得

    注: このテーブルは1ユーザー1レコードなので、常に1件のみ返します
    """
    try:
        courses = get_webcoach_resume_courses(db, userid, limit=1)

        # Transform to resume course format
        resume_courses = []
        for course in courses:
            resume_courses.append({
                "courseid": course["courseid"],
                "fullname": course["course_fullname"] or f"Course {course['courseid']}",
                "shortname": course["course_shortname"] or "",
                "summary": course["course_summary"],
                "progress": course["progress_percent"],
                "last_access_time": str(course["create_timestamp"]) if course["create_timestamp"] else None
            })

        return resume_courses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resume courses: {str(e)}"
        )


@router.post(
    "/resumecourse/{userid}",
    response_model=dict,
    summary="コース再開情報更新"
)
def update_resume_course(
    userid: int,
    data: ResumeCourseUpdate,
    db: Session = Depends(get_db)
):
    """
    ユーザーの最終アクセスコースと進捗率を更新します。

    webcoach_user_course_lastaccess テーブルに、1ユーザー1レコードで保存します。
    既存レコードがある場合は上書き、ない場合は新規作成します。

    Args:
        userid: ユーザーID (Moodle User ID)
        data: 更新するコースIDと進捗率

    Returns:
        更新結果
    """
    try:
        # Convert data to dict and add mdl_user_id
        record = {
            'mdl_user_id': userid,
            'courseid': data.courseid,
            'progress_percent': data.progress_percent,
            'create_timestamp': text('CURRENT_TIMESTAMP')
        }

        # Upsert resume course record
        result = upsert_webcoach_user_course_lastaccess(db, record)
        db.commit()

        return {
            "success": True,
            "message": "Resume course updated successfully",
            "userid": userid,
            "courseid": data.courseid,
            "progress": data.progress_percent
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update resume course: {str(e)}"
        )
