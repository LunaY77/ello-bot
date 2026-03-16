"""Top-level API router."""

from fastapi import APIRouter

from app.api.routes import debug_router, health_router, sessions_router, user_router

router = APIRouter()
router.include_router(health_router)
router.include_router(debug_router)
router.include_router(sessions_router)
router.include_router(user_router)
