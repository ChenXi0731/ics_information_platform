import os
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
import bcrypt
# pyrefly: ignore [missing-import]
import jwt

# 讀取 JWT 密鑰與設定
SECRET_KEY = os.getenv("JWT_SECRET", "fallback_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Token 有效期設為 7 天

def get_password_hash(password: str) -> str:
    """將明文密碼轉換為 bcrypt 雜湊值 (純 bcrypt 原生寫法)"""
    # 1. 產生隨機的鹽 (Salt)
    salt = bcrypt.gensalt()
    # 2. bcrypt 規定必須傳入 bytes 格式，因此將字串 encode
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    # 3. 將雜湊結果 decode 轉回一般字串，方便存入資料庫
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證明文密碼與資料庫的雜湊值是否相符"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict):
    """建立包含使用者身分的 JWT Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt