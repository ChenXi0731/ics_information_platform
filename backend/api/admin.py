# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_current_user, require_admin_only
from core.database import supabase

router = APIRouter()

@router.put("/admin/update-user-role/{target_user_id}")
def update_user_system_role(
    target_user_id: str,
    new_role: str,  # 'Admin', 'Manager', 或 'Contributor'
    current_user: dict = Depends(get_current_user)
):
    """
    【僅限系統管理員 Admin 可執行】
    變更、指派使用者的後台系統權限組
    """
    # 嚴格防禦：僅限 Admin
    require_admin_only(current_user.get("role"))
    
    if new_role not in ["Admin", "Manager", "Contributor"]:
        raise HTTPException(status_code=400, detail="無效的權限組名稱")
        
    try:
        supabase.table("users").update({"system_role": new_role}).eq("id", target_user_id).execute()
        return {"message": f"用戶權限已成功更新為 {new_role}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失敗：{str(e)}")
