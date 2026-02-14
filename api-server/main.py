"""
FastAPI Application for Moodle User Tracking
Main entry point - registers all routers
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base

# Import routers
from routers import health, courses, profiles, webcoach, badges, roadmaps, ai, admin

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Moodle User Tracking API",
    description="API for tracking user course access and managing profile settings",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
def startup_event():
    """Create database tables if they don't exist"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created/verified successfully")


# Register routers
app.include_router(health.router)
app.include_router(courses.router)
app.include_router(profiles.router)
app.include_router(webcoach.router)
app.include_router(badges.router)
app.include_router(roadmaps.router)
app.include_router(ai.router)
app.include_router(admin.router)


# ==========================================
# Run server
# ==========================================

if __name__ == "__main__":
    import uvicorn

    HOST = os.getenv("API_SERVER_HOST", "0.0.0.0")
    PORT = int(os.getenv("API_SERVER_PORT", "8001"))

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,  # Set to False in production
        log_level="info"
    )
