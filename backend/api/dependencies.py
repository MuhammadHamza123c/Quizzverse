from fastapi import HTTPException, Header, Request
from db.supabase_client import supabase
from gotrue.errors import AuthApiError, AuthRetryableError


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
    except AuthRetryableError:
        raise HTTPException(503, "Auth service temporarily unavailable, please try again")
    except AuthApiError as e:
        raise HTTPException(401, e.message)
