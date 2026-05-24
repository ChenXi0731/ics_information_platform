# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from api.schemas import CheckInRequest
from api.deps import get_current_user, require_manager_or_admin, verify_card_status_and_validity
from core.database import supabase

router = APIRouter()

@router.post("/checkin", status_code=status.HTTP_201_CREATED)
def check_in(req: CheckInRequest, current_user: dict = Depends(get_current_user)):
    # 1. 驗證操作者權限：限 Manager 或 Admin
    require_manager_or_admin(current_user.get("role"))
    
    # 2. 獲取被簽到學生的數位系卡資料
    profile_res = supabase.table("card_profiles").select("*").eq("user_id", req.student_user_id).execute()
    if not profile_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="簽到失敗：該使用者尚未建立數位系卡資料。"
        )
    
    student_profile = profile_res.data[0]
    
    # 3. 執行在校認證效期與學籍狀態攔截 (方案 A 效期攔截 / 休學攔截)
    # 學生通常為 Contributor 角色
    verify_card_status_and_validity(student_profile, "Contributor")
    
    # 4. 寫入 attendance_logs 簽到紀錄
    log_data = {
        "event_name": req.event_name,
        "user_id": req.student_user_id,      # 被掃描的學生
        "scanned_by": current_user["user_id"] # 負責掃描的幹部
    }
    
    try:
        supabase.table("attendance_logs").insert(log_data).execute()
        return {"message": "簽到成功！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"簽到寫入失敗：{str(e)}")