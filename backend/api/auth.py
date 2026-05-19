# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, status
from api.schemas import UserAuth, TokenResponse
from core.database import supabase
from core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserAuth):
    # 1. 檢查 Email 是否已經被註冊過
    response = supabase.table("users").select("*").eq("email", user.email).execute()
    if len(response.data) > 0:
        raise HTTPException(status_code=400, detail="此 Email 已經註冊過囉！")

    # 2. 密碼加密 (Bcrypt)
    hashed_password = get_password_hash(user.password)

    # 3. 寫入 Supabase 資料庫 (預設身分為一般貢獻者 Contributor)
    new_user_data = {
        "email": user.email,
        "password_hash": hashed_password,
        "system_role": "Contributor"
    }
    
    try:
        insert_res = supabase.table("users").insert(new_user_data).execute()
        return {
            "message": "註冊成功！", 
            "user_id": insert_res.data[0]["id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"註冊失敗：{str(e)}")


@router.post("/login", response_model=TokenResponse)
def login_user(user: UserAuth):
    # 1. 透過 Email 尋找使用者
    response = supabase.table("users").select("*").eq("email", user.email).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")
    
    db_user = response.data[0]

    # 2. 驗證密碼
    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")

    # 3. 密碼正確，簽發 JWT Token
    token_data = {
        "sub": db_user["id"],             # 將使用者 ID 藏進 token
        "role": db_user["system_role"]    # 將角色權限藏進 token
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=db_user["id"],
        system_role=db_user["system_role"]
    )