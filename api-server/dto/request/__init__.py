"""
Request DTOs for API endpoints
"""
from .profile import ProfileSettingsCreate, ProfileSettingsUpdate, WebCoachUserProfileUpdate
from .course import CourseAccessCreate, ResumeCourseUpdate
from .common import BulkUploadRequest

__all__ = [
    "ProfileSettingsCreate",
    "ProfileSettingsUpdate",
    "WebCoachUserProfileUpdate",
    "CourseAccessCreate",
    "ResumeCourseUpdate",
    "BulkUploadRequest",
]
