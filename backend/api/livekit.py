from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.livekit_service import generate_token

router = APIRouter(prefix="/api/livekit", tags=["LiveKit"])


class TokenRequest(BaseModel):
    room_name: str
    identity: str
    name: str = ""


@router.post("/token")
async def get_token(req: TokenRequest):
    token = generate_token(identity=req.identity, room_name=req.room_name, name=req.name)
    if not token:
        raise HTTPException(500, "LiveKit not configured")
    return {"token": token, "url": "wss://moviesphere-0veurkrq.livekit.cloud"}
