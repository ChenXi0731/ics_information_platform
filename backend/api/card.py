# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from api.schemas import CardProfileCreate
from api.deps import get_current_user
from core.database import supabase

router = APIRouter()

@router.post("/setup", status_code=status.HTTP_201_CREATED)
def setup_card(profile: CardProfileCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # 1. 檢查是否已經建立過系卡
    existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="您的系卡已經建立過了！")
    
    # 2. 準備寫入資料
    new_profile = profile.model_dump()
    new_profile["user_id"] = user_id
    
    try:
        supabase.table("card_profiles").insert(new_profile).execute()
        return {"message": "數位系卡建立成功！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立失敗：{str(e)}")

@router.get("/me")
def get_my_card(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # 1. 獲取系卡基本資料
    profile_res = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="尚未建立系卡資料，請先前往設定")
        
    # 2. 獲取動態組織徽章 (Badges)
    badges_res = supabase.table("org_badges").select("*").eq("user_id", user_id).execute()
    
    # 3. 合併資料回傳
    card_data = profile_res.data[0]
    card_data["badges"] = badges_res.data
    
    return card_data