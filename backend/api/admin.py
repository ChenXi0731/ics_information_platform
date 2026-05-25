# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_current_user, require_admin_only, require_manager_or_admin
from core.database import supabase

router = APIRouter()

@router.put("/admin/update-user-role/{target_user_id}")
def update_user_system_role(
    target_user_id: str,
    new_role: str,  # 'Admin', 'Manager', 或 'Contributor'
    current_user: dict = Depends(get_current_user)
):
    """【僅限系統管理員 Admin 可執行】變更、指派使用者的後台系統權限組"""
    require_admin_only(current_user.get("role"))
    
    if new_role not in ["Admin", "Manager", "Contributor"]:
        raise HTTPException(status_code=400, detail="無效的權限組名稱")
        
    try:
        supabase.table("users").update({"system_role": new_role}).eq("id", target_user_id).execute()
        return {"message": f"用戶權限已成功更新為 {new_role}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失敗：{str(e)}")


# 🚀 這是全新為你新增的後台審核區域 API
@router.get("/admin/pending-verifications")
def get_pending_verifications(
    type: str = "student",  # 接受 "student" 或 "alumni"
    current_user: dict = Depends(get_current_user)
):
    """
    【活動管理員 Manager / 系統管理員 Admin 可執行】
    管理員專屬後台：分流獲取待審核的名單（包含上傳的證明檔案網址）
    """
    require_manager_or_admin(current_user.get("role"))
    
    try:
        if type == "alumni":
            # 讀取狀態為 Pending_Alumni 的系友開通申請
            res = supabase.table("card_profiles").select("user_id, name, student_or_staff_id, enrollment_proof_url, expected_graduation_year").eq("verification_status", "Pending_Alumni").execute()
        else:
            # 讀取狀態為 Pending 的普通在校生展延申請
            res = supabase.table("card_profiles").select("user_id, name, student_or_staff_id, enrollment_proof_url, proof_academic_year, proof_semester").eq("verification_status", "Pending").execute()
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取待審核列表失敗：{str(e)}")