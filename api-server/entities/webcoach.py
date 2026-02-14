"""
WebCoach specific entity models
"""
from sqlalchemy import Column, BigInteger, SmallInteger, String, Text, TIMESTAMP, Index
from database import Base


class WebCoachUserCourseLastAccess(Base):
    """
    WebCoach: ユーザーが最後にアクセスしたコース
    """
    __tablename__ = "webcoach_user_course_lastaccess"

    mdl_user_id = Column(BigInteger, primary_key=True, nullable=False, index=True)
    courseid = Column(BigInteger, nullable=False)
    progress_percent = Column(BigInteger, nullable=False, default=0)
    create_timestamp = Column(TIMESTAMP, nullable=False)

    __table_args__ = (
        Index('idx_webcoach_user_course', 'mdl_user_id', 'courseid'),
    )


class WebCoachUserProfile(Base):
    """
    WebCoach: ユーザープロフィール
    """
    __tablename__ = "webcoach_user_profile"

    mdl_user_id = Column(BigInteger, primary_key=True, nullable=False, index=True)
    nick_name = Column(String(256), nullable=True)
    self_intro = Column(Text, nullable=True)
    target_job = Column(String(256), nullable=True)
    ideal_work_style = Column(String(256), nullable=True)
    monthly_goal = Column(String(256), nullable=True)
    goal = Column(Text, nullable=True)
    badge_count = Column(SmallInteger, nullable=True, default=0)


class WebCoachLearningRoadmap(Base):
    """
    WebCoach: ロードマップ定義
    """
    __tablename__ = "webcoach_learning_roadmap"

    roadmap_id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    category = Column(String(256), nullable=False)
    required_study_time = Column(BigInteger, nullable=False)
    icon_url = Column(String(1024), nullable=False)

    __table_args__ = (
        Index('idx_webcoach_roadmap_category', 'category'),
    )


class WebCoachLearningRoadmapStep(Base):
    """
    WebCoach: ロードマップステップ（各ロードマップに紐づくコース）
    """
    __tablename__ = "webcoach_learning_roadmap_step"

    roadmap_id = Column(BigInteger, primary_key=True, nullable=False, index=True)
    step_number = Column(BigInteger, primary_key=True, nullable=False, index=True)
    mdl_course_id = Column(BigInteger, nullable=False)

    __table_args__ = (
        Index('idx_webcoach_roadmap_step', 'roadmap_id', 'step_number'),
        Index('idx_webcoach_step_course', 'mdl_course_id'),
    )
