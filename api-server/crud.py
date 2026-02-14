"""
CRUD operations for user course access and profile settings
"""
import time
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from entities import (
    UserLastCourseAccess,
    UserProfileSettings,
    WebCoachUserCourseLastAccess,
    WebCoachUserProfile,
    WebCoachLearningRoadmap,
    WebCoachLearningRoadmapStep,
)
from dto.request import (
    CourseAccessCreate,
    ProfileSettingsCreate,
    ProfileSettingsUpdate,
)
from mappers import ProfileMapper, CourseMapper


# ==========================================
# Course Access CRUD
# ==========================================

def record_course_access(db: Session, data: CourseAccessCreate) -> UserLastCourseAccess:
    """
    コースアクセスを記録（既存の場合は更新）

    Args:
        db: Database session
        data: Course access data

    Returns:
        UserLastCourseAccess: Created or updated record
    """
    current_time = int(time.time())

    # Check if record already exists
    existing = db.query(UserLastCourseAccess).filter(
        UserLastCourseAccess.userid == data.userid,
        UserLastCourseAccess.courseid == data.courseid
    ).first()

    if existing:
        # Update existing record using mapper
        CourseMapper.update_access(existing, current_time)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new record using mapper
        db_record = CourseMapper.from_create_request(data, current_time)
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record


def get_user_last_accessed_courses(
    db: Session,
    userid: int,
    limit: int = 10
) -> List[dict]:
    """
    ユーザーの最終アクセスコース一覧を取得（コース情報付き）

    Args:
        db: Database session
        userid: User ID
        limit: Maximum number of courses to return

    Returns:
        List of courses with access information
    """
    # Join with mdl_course table to get course details
    query = text("""
        SELECT
            a.id,
            a.userid,
            a.courseid,
            a.lastaccess,
            a.accesscount,
            c.fullname as course_fullname,
            c.shortname as course_shortname,
            c.summary as course_summary
        FROM mdl_user_last_course_access a
        LEFT JOIN mdl_course c ON a.courseid = c.id
        WHERE a.userid = :userid
        ORDER BY a.lastaccess DESC
        LIMIT :limit
    """)

    result = db.execute(query, {"userid": userid, "limit": limit})
    rows = result.fetchall()

    return [
        {
            "id": row[0],
            "userid": row[1],
            "courseid": row[2],
            "lastaccess": row[3],
            "accesscount": row[4],
            "course_fullname": row[5],
            "course_shortname": row[6],
            "course_summary": row[7],
        }
        for row in rows
    ]


def get_most_accessed_courses(
    db: Session,
    userid: int,
    limit: int = 5
) -> List[dict]:
    """
    ユーザーの最もアクセスの多いコース一覧を取得

    Args:
        db: Database session
        userid: User ID
        limit: Maximum number of courses to return

    Returns:
        List of courses ordered by access count
    """
    query = text("""
        SELECT
            a.id,
            a.userid,
            a.courseid,
            a.lastaccess,
            a.accesscount,
            c.fullname as course_fullname,
            c.shortname as course_shortname
        FROM mdl_user_last_course_access a
        LEFT JOIN mdl_course c ON a.courseid = c.id
        WHERE a.userid = :userid
        ORDER BY a.accesscount DESC, a.lastaccess DESC
        LIMIT :limit
    """)

    result = db.execute(query, {"userid": userid, "limit": limit})
    rows = result.fetchall()

    return [
        {
            "id": row[0],
            "userid": row[1],
            "courseid": row[2],
            "lastaccess": row[3],
            "accesscount": row[4],
            "course_fullname": row[5],
            "course_shortname": row[6],
        }
        for row in rows
    ]


# ==========================================
# Profile Settings CRUD
# ==========================================

def create_profile_settings(
    db: Session,
    data: ProfileSettingsCreate
) -> UserProfileSettings:
    """
    プロフィール設定を作成

    Args:
        db: Database session
        data: Profile settings data

    Returns:
        UserProfileSettings: Created record
    """
    current_time = int(time.time())

    # Create entity using mapper
    db_settings = ProfileMapper.from_create_request(data, current_time)

    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings


def get_profile_settings(db: Session, userid: int) -> Optional[UserProfileSettings]:
    """
    プロフィール設定を取得

    Args:
        db: Database session
        userid: User ID

    Returns:
        UserProfileSettings or None
    """
    return db.query(UserProfileSettings).filter(
        UserProfileSettings.userid == userid
    ).first()


def update_profile_settings(
    db: Session,
    userid: int,
    data: ProfileSettingsUpdate
) -> Optional[UserProfileSettings]:
    """
    プロフィール設定を更新（部分更新対応）

    Args:
        db: Database session
        userid: User ID
        data: Profile settings update data

    Returns:
        Updated UserProfileSettings or None if not found
    """
    db_settings = get_profile_settings(db, userid)

    if not db_settings:
        return None

    # Update entity using mapper
    ProfileMapper.update_from_request(db_settings, data)

    db.commit()
    db.refresh(db_settings)
    return db_settings


def get_or_create_profile_settings(
    db: Session,
    userid: int
) -> UserProfileSettings:
    """
    プロフィール設定を取得（存在しない場合はデフォルト値で作成）

    Args:
        db: Database session
        userid: User ID

    Returns:
        UserProfileSettings: Existing or newly created settings
    """
    settings = get_profile_settings(db, userid)

    if settings:
        return settings

    # Create default settings
    default_data = ProfileSettingsCreate(userid=userid)
    return create_profile_settings(db, default_data)


# ==========================================
# WebCoach CRUD Operations
# ==========================================

def upsert_webcoach_user_course_lastaccess(
    db: Session,
    record: Dict[str, Any]
) -> WebCoachUserCourseLastAccess:
    """
    WebCoach: ユーザーコース最終アクセスを登録/更新

    Args:
        db: Database session
        record: Record data

    Returns:
        WebCoachUserCourseLastAccess: Created or updated record
    """
    mdl_user_id = record.get('mdl_user_id')
    courseid = record.get('courseid')
    progress_percent = record.get('progress_percent', 0)
    create_timestamp = record.get('create_timestamp', text('CURRENT_TIMESTAMP'))

    # Check if record exists
    existing = db.query(WebCoachUserCourseLastAccess).filter(
        WebCoachUserCourseLastAccess.mdl_user_id == mdl_user_id
    ).first()

    if existing:
        # Update existing record
        existing.courseid = courseid
        existing.progress_percent = progress_percent
        existing.create_timestamp = create_timestamp
    else:
        # Create new record
        existing = WebCoachUserCourseLastAccess(
            mdl_user_id=mdl_user_id,
            courseid=courseid,
            progress_percent=progress_percent,
            create_timestamp=create_timestamp
        )
        db.add(existing)

    db.flush()
    return existing


def get_webcoach_user_profile(
    db: Session,
    mdl_user_id: int
) -> Optional[WebCoachUserProfile]:
    """
    WebCoach: ユーザープロフィールを取得

    Args:
        db: Database session
        mdl_user_id: Moodle User ID

    Returns:
        WebCoachUserProfile or None
    """
    return db.query(WebCoachUserProfile).filter(
        WebCoachUserProfile.mdl_user_id == mdl_user_id
    ).first()


def upsert_webcoach_user_profile(
    db: Session,
    record: Dict[str, Any]
) -> WebCoachUserProfile:
    """
    WebCoach: ユーザープロフィールを登録/更新

    Args:
        db: Database session
        record: Record data

    Returns:
        WebCoachUserProfile: Created or updated record
    """
    mdl_user_id = record.get('mdl_user_id')
    nick_name = record.get('nick_name')
    self_intro = record.get('self_intro')
    target_job = record.get('target_job')
    ideal_work_style = record.get('ideal_work_style')
    monthly_goal = record.get('monthly_goal')
    goal = record.get('goal')
    badge_count = record.get('badge_count', 0)

    # Check if record exists
    existing = db.query(WebCoachUserProfile).filter(
        WebCoachUserProfile.mdl_user_id == mdl_user_id
    ).first()

    if existing:
        # Update existing record
        if nick_name is not None:
            existing.nick_name = nick_name
        if self_intro is not None:
            existing.self_intro = self_intro
        if target_job is not None:
            existing.target_job = target_job
        if ideal_work_style is not None:
            existing.ideal_work_style = ideal_work_style
        if monthly_goal is not None:
            existing.monthly_goal = monthly_goal
        if goal is not None:
            existing.goal = goal
        if badge_count is not None:
            existing.badge_count = badge_count
    else:
        # Create new record
        existing = WebCoachUserProfile(
            mdl_user_id=mdl_user_id,
            nick_name=nick_name,
            self_intro=self_intro,
            target_job=target_job,
            ideal_work_style=ideal_work_style,
            monthly_goal=monthly_goal,
            goal=goal,
            badge_count=badge_count
        )
        db.add(existing)

    db.flush()
    return existing


def upsert_webcoach_learning_roadmap(
    db: Session,
    record: Dict[str, Any]
) -> WebCoachLearningRoadmap:
    """
    WebCoach: ロードマップを登録/更新

    Args:
        db: Database session
        record: Record data

    Returns:
        WebCoachLearningRoadmap: Created or updated record
    """
    roadmap_id = record.get('roadmap_id')
    name = record.get('name')
    category = record.get('category')
    required_study_time = record.get('required_study_time')
    icon_url = record.get('icon_url')

    if roadmap_id:
        # Update existing roadmap
        existing = db.query(WebCoachLearningRoadmap).filter(
            WebCoachLearningRoadmap.roadmap_id == roadmap_id
        ).first()

        if existing:
            existing.name = name
            existing.category = category
            existing.required_study_time = required_study_time
            existing.icon_url = icon_url
        else:
            # Create with specific ID
            existing = WebCoachLearningRoadmap(
                roadmap_id=roadmap_id,
                name=name,
                category=category,
                required_study_time=required_study_time,
                icon_url=icon_url
            )
            db.add(existing)
    else:
        # Create new roadmap (auto-increment ID)
        existing = WebCoachLearningRoadmap(
            name=name,
            category=category,
            required_study_time=required_study_time,
            icon_url=icon_url
        )
        db.add(existing)

    db.flush()
    return existing


def upsert_webcoach_learning_roadmap_step(
    db: Session,
    record: Dict[str, Any]
) -> WebCoachLearningRoadmapStep:
    """
    WebCoach: ロードマップステップを登録/更新

    Args:
        db: Database session
        record: Record data

    Returns:
        WebCoachLearningRoadmapStep: Created or updated record
    """
    roadmap_id = record.get('roadmap_id')
    step_number = record.get('step_number')
    mdl_course_id = record.get('mdl_course_id')

    # Check if record exists
    existing = db.query(WebCoachLearningRoadmapStep).filter(
        WebCoachLearningRoadmapStep.roadmap_id == roadmap_id,
        WebCoachLearningRoadmapStep.step_number == step_number
    ).first()

    if existing:
        # Update existing record
        existing.mdl_course_id = mdl_course_id
    else:
        # Create new record
        existing = WebCoachLearningRoadmapStep(
            roadmap_id=roadmap_id,
            step_number=step_number,
            mdl_course_id=mdl_course_id
        )
        db.add(existing)

    db.flush()
    return existing


def get_webcoach_resume_courses(
    db: Session,
    mdl_user_id: int,
    limit: int = 5
) -> List[dict]:
    """
    WebCoach: ユーザーの再開可能なコース一覧を取得

    Args:
        db: Database session
        mdl_user_id: Moodle User ID
        limit: Maximum number of courses to return

    Returns:
        List of resume courses with course information
    """
    # Join with mdl_course table to get course details
    query = text("""
        SELECT
            w.mdl_user_id,
            w.courseid,
            w.progress_percent,
            w.create_timestamp,
            c.fullname as course_fullname,
            c.shortname as course_shortname,
            c.summary as course_summary
        FROM webcoach_user_course_lastaccess w
        LEFT JOIN mdl_course c ON w.courseid = c.id
        WHERE w.mdl_user_id = :mdl_user_id
        ORDER BY w.create_timestamp DESC
        LIMIT :limit
    """)

    result = db.execute(query, {"mdl_user_id": mdl_user_id, "limit": limit})
    rows = result.fetchall()

    courses = []
    for row in rows:
        courses.append({
            "mdl_user_id": row[0],
            "courseid": row[1],
            "progress_percent": row[2],
            "create_timestamp": row[3],
            "course_fullname": row[4],
            "course_shortname": row[5],
            "course_summary": row[6]
        })

    return courses


# ==========================================
# Moodle User Information CRUD Operations
# ==========================================

def get_moodle_user_info(
    db: Session,
    userid: int
) -> Optional[dict]:
    """
    Moodleユーザー情報を取得

    Args:
        db: Database session
        userid: User ID

    Returns:
        User info dict with firstname, lastname, etc. or None
    """
    query = text("""
        SELECT
            id,
            username,
            firstname,
            lastname,
            email
        FROM mdl_user
        WHERE id = :userid
        LIMIT 1
    """)

    result = db.execute(query, {"userid": userid})
    row = result.fetchone()

    if not row:
        return None

    return {
        "id": row[0],
        "username": row[1],
        "firstname": row[2],
        "lastname": row[3],
        "email": row[4]
    }


# ==========================================
# Badge Recommendation CRUD Operations
# ==========================================

def get_recommended_badges(
    db: Session,
    userid: int,
    limit: int = 10
) -> List[dict]:
    """
    ユーザーにおすすめのバッジを取得

    推薦ロジック:
    1. ユーザーが最後にアクセスしたコースに関連するバッジを取得
    2. ユーザーが未取得のバッジのみをフィルタリング
    3. アクティブなバッジ（status=1または3）のみを対象

    Args:
        db: Database session
        userid: User ID
        limit: Maximum number of badges to return

    Returns:
        List of recommended badges with course information
    """
    query = text("""
        SELECT DISTINCT
            b.id as badge_id,
            b.name as badge_name,
            b.description as badge_description,
            b.type as badge_type,
            b.courseid,
            c.fullname as course_fullname,
            c.shortname as course_shortname,
            b.timecreated,
            b.timemodified
        FROM mdl_badge b
        LEFT JOIN mdl_course c ON b.courseid = c.id
        WHERE b.status IN (1, 3)
          AND b.id NOT IN (
              SELECT bi.badgeid
              FROM mdl_badge_issued bi
              WHERE bi.userid = :userid
          )
          AND (
              b.courseid IN (
                  SELECT wc.courseid
                  FROM webcoach_user_course_lastaccess wc
                  WHERE wc.mdl_user_id = :userid
              )
              OR b.type = 1
          )
        ORDER BY
            CASE WHEN b.type = 2 THEN 0 ELSE 1 END,
            b.timemodified DESC
        LIMIT :limit
    """)

    result = db.execute(query, {"userid": userid, "limit": limit})
    rows = result.fetchall()

    badges = []
    for row in rows:
        badges.append({
            "badge_id": row[0],
            "badge_name": row[1],
            "badge_description": row[2],
            "badge_type": row[3],  # 1=site badge, 2=course badge
            "courseid": row[4],
            "course_fullname": row[5],
            "course_shortname": row[6],
            "timecreated": row[7],
            "timemodified": row[8]
        })

    return badges


def get_user_issued_badges(
    db: Session,
    userid: int,
    limit: int = 50
) -> List[dict]:
    """
    ユーザーが取得済みのバッジ一覧を取得

    Args:
        db: Database session
        userid: User ID
        limit: Maximum number of badges to return

    Returns:
        List of issued badges
    """
    query = text("""
        SELECT
            bi.id as issued_id,
            bi.badgeid,
            bi.userid,
            bi.dateissued,
            bi.dateexpire,
            bi.visible,
            b.name as badge_name,
            b.description as badge_description,
            b.type as badge_type,
            b.courseid,
            c.fullname as course_fullname
        FROM mdl_badge_issued bi
        JOIN mdl_badge b ON bi.badgeid = b.id
        LEFT JOIN mdl_course c ON b.courseid = c.id
        WHERE bi.userid = :userid
        ORDER BY bi.dateissued DESC
        LIMIT :limit
    """)

    result = db.execute(query, {"userid": userid, "limit": limit})
    rows = result.fetchall()

    badges = []
    for row in rows:
        badges.append({
            "issued_id": row[0],
            "badge_id": row[1],
            "userid": row[2],
            "date_issued": row[3],
            "date_expire": row[4],
            "visible": row[5],
            "badge_name": row[6],
            "badge_description": row[7],
            "badge_type": row[8],
            "courseid": row[9],
            "course_fullname": row[10]
        })

    return badges
