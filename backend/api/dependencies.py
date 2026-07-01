from fastapi import HTTPException, Request
from db.supabase_client import supabase


async def get_current_user(request: Request):
    authorization = request.headers.get("authorization")
    if not authorization:
        raise HTTPException(401, "Authorization header missing")
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header format")
    token = authorization.replace("Bearer ", "")
    try:
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(401, "Invalid token")
        return res.user
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "retry" in msg.lower():
            raise HTTPException(503, "Auth service temporarily unavailable, please try again")
        raise HTTPException(401, msg)
