"""
Response DTOs for API endpoints
"""
from .profile import (
    ProfileSettingsResponse,
    UserProfileResponse,
    WebCoachUserProfileResponse,
)
from .course import (
    CourseAccessResponse,
    LastAccessedCourse,
    ResumeCourseResponse,
)
from .badge import BadgeResponse, UserBadgesResponse
from .roadmap import RoadmapResponse, RoadmapListResponse
from .common import (
    HealthResponse,
    ErrorResponse,
    BulkUploadError,
    BulkUploadResponse,
)

__all__ = [
    # Profile
    "ProfileSettingsResponse",
    "UserProfileResponse",
    "WebCoachUserProfileResponse",
    # Course
    "CourseAccessResponse",
    "LastAccessedCourse",
    "ResumeCourseResponse",
    # Badge
    "BadgeResponse",
    "UserBadgesResponse",
    # Roadmap
    "RoadmapResponse",
    "RoadmapListResponse",
    # Common
    "HealthResponse",
    "ErrorResponse",
    "BulkUploadError",
    "BulkUploadResponse",
]
