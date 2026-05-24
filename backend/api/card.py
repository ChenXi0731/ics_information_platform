# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from api.schemas import CardProfileCreate
from api.deps import get_current_user, require_manager_or_admin
from core.database import supabase
import os
import shutil
from datetime import datetime, timezone

router = APIRouter()

@router.post("/setup", status_code=status.HTTP_201_CREATED)
def setup_card(profile: CardProfileCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # 1. 檢查是否已經建立過系卡
    existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="您的系卡已經建立過了！")
    
    # 2. 準備寫入資料 (將單一 identity_type 轉換為 identities 陣列並進行學號解析)
    raw_data = profile.model_dump()
    identity = raw_data.pop("identity_type", "Student")
    
    new_profile = {
        "user_id": user_id,
        "name": raw_data["name"],
        "student_or_staff_id": raw_data["student_or_staff_id"],
        "identities": [identity],
        "entry_year": raw_data["entry_year"]
    }
    
    if identity == "Student":
        try:
            from core.utils import parse_student_id_details
            degree_code, class_generation, expected_graduation_year = parse_student_id_details(raw_data["student_or_staff_id"])
            new_profile["degree_code"] = degree_code
            new_profile["class_generation"] = class_generation
            new_profile["expected_graduation_year"] = expected_graduation_year
            new_profile["current_status"] = "Active"
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"學號自動解析失敗：{str(e)}")
    else:
        new_profile["degree_code"] = "A"
        new_profile["class_generation"] = raw_data["entry_year"]
        new_profile["expected_graduation_year"] = raw_data["entry_year"] + 4
        new_profile["current_status"] = "Active"
    
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

@router.post("/upload-enrollment-proof")
def upload_enrollment_proof(
    academic_year: int = Form(...),
    semester: int = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    【一般用戶 Contributor 可執行】
    學生端：上傳世新大學在學證明 PDF 或截圖 (PNG, JPG, JPEG, HEIC)
    """
    user_id = current_user["user_id"]
    
    # 1. 檢查是否已建卡
    existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="尚未建立數位系卡，無法上傳在學證明。")
    
    profile = existing.data[0]
    
    # 2. 阻擋安全防偽防禦
    class_generation = profile.get("class_generation", 111)
    expected_graduation_year = profile.get("expected_graduation_year", 115)
    
    if academic_year < class_generation:
        raise HTTPException(status_code=400, detail=f"申報學年度不合理：不得小於您的入學學級 ({class_generation}級)。")
    if academic_year > expected_graduation_year + 2:
        raise HTTPException(status_code=400, detail=f"申報學年度不合理：已超出您的預計畢業學年限。")
    
    # 3. 檢查副檔名
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg", ".heic"]:
        raise HTTPException(status_code=400, detail="不支援的檔案格式！僅限上傳 .pdf, .png, .jpg, .jpeg, .heic 格式檔案。")
        
    from core.utils import UPLOAD_DIR
    
    # 4. 保存實體檔案至 uploads 目錄
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立檔案儲存目錄失敗：{str(e)}")
        
    save_filename = f"{user_id}_{academic_year}_{semester}{ext}"
    file_path = os.path.join(UPLOAD_DIR, save_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"檔案儲存失敗：{str(e)}")
        
    # 5. 更新 Supabase
    update_data = {
        "enrollment_proof_url": f"/uploads/{save_filename}",
        "proof_academic_year": academic_year,
        "proof_semester": semester,
        "verification_status": "Pending"
    }
    
    try:
        supabase.table("card_profiles").update(update_data).eq("user_id", user_id).execute()
        return {"message": "在學證明已成功上傳，等待管理員審核！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"資料庫更新失敗：{str(e)}")

@router.post("/verify-and-extend/{target_user_id}")
def verify_and_extend_card(
    target_user_id: str,
    semester: int,  # 1 代表上學期, 2 代表下學期
    action: str = "approve",  # "approve" 或 "reject"
    current_user: dict = Depends(get_current_user)
):
    """
    【活動管理員 Manager / 系統管理員 Admin 可執行】
    審核在學證明並執行一鍵展延或拒絕退件
    """
    require_manager_or_admin(current_user.get("role"))
    
    if action == "reject":
        try:
            supabase.table("card_profiles").update({
                "verification_status": "Rejected"
            }).eq("user_id", target_user_id).execute()
            return {"message": "已拒絕該在學證明，已將狀態標記為退件。"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"退件操作失敗：{str(e)}")
            
    now = datetime.now(timezone.utc)
    
    # 計算展延過期時間（上學期有效至隔年 2/15，下學期有效至當年 9/15）
    if semester == 1:
        next_year = now.year + 1 if now.month >= 8 else now.year
        valid_date = datetime(next_year, 2, 15, 23, 59, 59, tzinfo=timezone.utc)
    else:
        valid_date = datetime(now.year, 9, 15, 23, 59, 59, tzinfo=timezone.utc)
        
    update_data = {
        "valid_until": valid_date.isoformat(),
        "current_status": "Active",
        "verification_status": "Approved",
        "last_verified_at": now.isoformat()
    }
    
    try:
        supabase.table("card_profiles").update(update_data).eq("user_id", target_user_id).execute()
        return {"message": f"審核成功！該學生數位系卡已展延至 {valid_date.strftime('%Y-%m-%d')}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"展延資料庫更新失敗：{str(e)}")