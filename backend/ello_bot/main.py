from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

app = FastAPI(title="Ello Bot API")


@app.get("/health")
async def health_check():
    return {
        "ok": True,
    }
