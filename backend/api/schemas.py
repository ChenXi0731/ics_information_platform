# pyrefly: ignore [missing-import]
from pydantic import BaseModel

class UserAuth(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    system_role: str

class CardProfileCreate(BaseModel):
    name: str
    student_or_staff_id: str
    identity_type: str  # 限制填入 'Student', 'Faculty', 'Alumni'
    entry_year: int

class CheckInRequest(BaseModel):
    event_name: str
    student_user_id: str  # 這是從學生的 QR Code 掃描出來的 user_id