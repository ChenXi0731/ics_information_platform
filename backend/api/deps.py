# pyrefly: ignore [missing-import]
from fastapi import Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# pyrefly: ignore [missing-import]
import jwt
import os

security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET", "fallback_secret_key")
ALGORITHM = "HS256"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """解析 JWT Token，並回傳使用者的 user_id 與 role"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="無效的憑證")
        return {"user_id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="憑證已過期，請重新登入")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="無法驗證憑證")


from datetime import datetime, timezone

def verify_card_status_and_validity(profile: dict, user_system_role: str):
    """
    核心權限與效期攔截器
    """
    identities = profile.get("identities", [])
    current_status = profile.get("current_status", "Active")
    valid_until_str = profile.get("valid_until")
    
    # 防禦 1：休學/停用狀態攔截（立刻暫停系卡與特約商店功能）
    if current_status == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您的學籍目前處於暫停狀態，數位系卡與特約商店功能已暫時凍結。如有疑問請洽系辦。"
        )
        
    # 防禦 2：針對具有 Student 身分者，執行方案 A 展延效期檢查
    if "Student" in identities and current_status == "Active":
        if valid_until_str:
            try:
                # 轉換 Supabase 的 ISO 時間字串
                valid_until = datetime.fromisoformat(valid_until_str.replace("Z", "+00:00"))
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="數位系卡效期時間格式解析錯誤，請洽管理員。"
                )
            if datetime.now(timezone.utc) > valid_until:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="您的數位系卡本學期已過期，請上傳新學期『在學證明』進行在校認證展延。"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="尚未進行當學期在校認證。"
            )
            
    return True

# 系統權限群組檢查常規函數 (用於各 API 節點保護)
def require_manager_or_admin(system_role: str):
    # 活動管理員(Manager)與系統管理員(Admin)皆可新增最新消息與管理特約商家
    if system_role not in ["Manager", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="權限不足，限活動管理員或系統管理員操作"
        )

def require_admin_only(system_role: str):
    # 只有系統管理員(Admin)可以編輯用戶權限
    if system_role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="權限不足，僅限系統管理員操作"
        )