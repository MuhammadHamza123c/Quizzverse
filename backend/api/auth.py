from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase
from gotrue.errors import AuthApiError

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
async def signup(req: SignupRequest):
    try:
        res = supabase.auth.sign_up(
            credentials={
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "full_name": req.full_name or "User",
                    }
                },
            }
        )
        if res.user:
            return {"message": "Signup successful", "user_id": res.user.id}
        raise HTTPException(status_code=400, detail="Signup failed")
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(req: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        if res.user:
            return {
                "message": "Login successful",
                "access_token": res.session.access_token,
                "user_id": res.user.id,
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
