from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.errors import install_exception_handlers
from app.api.router import router as api_router
from app.core import settings
from app.runtime import app_lifespan

STATIC_DIR = Path(__file__).resolve().parent / "static"


app = FastAPI(
    title=settings.APP_NAME,
    description="Ello Bot Backend API",
    version=settings.APP_VERSION,
    lifespan=app_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

install_exception_handlers(app)
app.include_router(api_router)


def main():
    """Run the FastAPI application with Uvicorn.

    Args:
        None

    Returns:
        None
    """
    uvicorn.run(
        "app.main:app",
        host=settings.server.HOST,
        port=settings.server.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    main()
