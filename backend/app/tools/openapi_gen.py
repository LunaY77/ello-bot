"""
This script generates the OpenAPI specification for the FastAPI application and saves it to a JSON file.
"""
import json
import pathlib

from app.main import app

def main() -> None:
    repo_root = pathlib.Path(__file__).resolve().parents[3]

    p = repo_root / "docs" / "api" / "openapi.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )