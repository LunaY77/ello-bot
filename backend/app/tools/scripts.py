"""
Scripts for ello-bot.
Do not import this module from application code (e.g., repository) to avoid accidental misuse.
"""
import json
import pathlib
import subprocess
import sys


def lint() -> None:
    subprocess.run(["ruff", "check", ".", "--fix"], check=True)
    subprocess.run(["ruff", "format", "."], check=True)


def check() -> None:
    result = subprocess.run(["ruff", "check", "."])
    sys.exit(result.returncode)


def gen_openapi() -> None:
    from app.main import app

    repo_root = pathlib.Path(__file__).resolve().parents[3]
    p = repo_root / "docs" / "api" / "openapi.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
