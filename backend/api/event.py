# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from api.schemas import CheckInRequest
from api.deps import get_current_user
from core.database import supabase

router = APIRouter()

@router.post("/checkin", status_code=status.HTTP_201_CREATED)
def check_in(req: CheckInRequest, current_user: dict = Depends(get_current_user)):
    # 1. 驗證權限：只有 Manager 或 Admin 可以幫人掃碼簽到
    if current_user["role"] not in ["Admin", "Manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="權限不足：只有活動管理者 (Manager) 可以進行掃碼簽到"
        )
    
    # 2. 寫入 attendance_logs 簽到紀錄
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