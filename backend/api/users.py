from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db.supabase_client import supabase
from api.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    university: str | None = None
    department: str | None = None
    grade: str | None = None
    avatar_url: str | None = None

@router.get("/me")
async def get_profile(user=Depends(get_current_user)):
    res = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
    if not res.data:
        raise HTTPException(404, "Profile not found")
    return res.data

@router.put("/me")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(400, "No fields to update")
    res = supabase.table("profiles").update(update_dict).eq("id", user.id).execute()
    return {"message": "Profile updated", "data": res.data}
