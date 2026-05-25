# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from api.schemas import CardProfileCreate
from api.deps import get_current_user, require_manager_or_admin
from core.database import supabase
import os
from datetime import datetime, timezone

router = APIRouter()

def get_current_taiwan_academic_year() -> int:
    """計算當前行政時間對應的台灣民國學年度"""
    now_dt = datetime.now(timezone.utc)
    roc_year = now_dt.year - 1911
    # 依世新大學行政慣例：1月至7月屬於前一年的學年度（例如 2026年5月為 114學年度第2學期）
    return roc_year - 1 if 1 <= now_dt.month <= 7 else roc_year


@router.post("/setup", status_code=status.HTTP_201_CREATED)
def setup_card(profile: CardProfileCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # 1. 檢查是否已經建立過系卡
    existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="您的系卡已經建立過了！")
    
    # 2. 準備寫入資料
    raw_data = profile.model_dump()
    identity = raw_data.pop("identity_type", "Student")
    
    new_profile = {
        "user_id": user_id,
        "name": raw_data["name"],
        "student_or_staff_id": raw_data["student_or_staff_id"],
        "entry_year": raw_data["entry_year"]
    }
    
    current_academic_year = get_current_taiwan_academic_year()
    
    if identity == "Student":
        try:
            from core.utils import parse_student_id_details
            degree_code, class_generation, expected_graduation_year = parse_student_id_details(raw_data["student_or_staff_id"])
            new_profile["degree_code"] = degree_code
            new_profile["class_generation"] = class_generation
            new_profile["expected_graduation_year"] = expected_graduation_year
            
            # 🚀 核心防禦：若學號已超過畢業年限，無論用戶自選「學生」，
            # 系統一律強制建立 Alumni 卡（只有 Alumni，完全不允許 Student 存在）
            if expected_graduation_year <= current_academic_year:
                new_profile["identities"] = ["Alumni"]
                new_profile["current_status"] = "Graduated"
                new_profile["valid_until"] = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc).isoformat()
            else:
                new_profile["identities"] = ["Student"]
                new_profile["current_status"] = "Active"
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"學號自動解析失敗：{str(e)}")
    elif identity == "Alumni":
        # 使用者主動選擇系友身份
        try:
            from core.utils import parse_student_id_details
            degree_code, class_generation, expected_graduation_year = parse_student_id_details(raw_data["student_or_staff_id"])
            new_profile["degree_code"] = degree_code
            new_profile["class_generation"] = class_generation
            new_profile["expected_graduation_year"] = expected_graduation_year
        except Exception:
            # 系友學號解析失敗不阻擋建卡，使用入學年份推算
            new_profile["degree_code"] = "A"
            new_profile["class_generation"] = raw_data["entry_year"]
            new_profile["expected_graduation_year"] = raw_data["entry_year"] + 4
        
        # 系友：永遠只有 Alumni，不允許混入 Student
        new_profile["identities"] = ["Alumni"]
        new_profile["current_status"] = "Graduated"
        new_profile["valid_until"] = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    else:
        # Faculty 等其他身份
        new_profile["identities"] = [identity]
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
    
    profile_res = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="尚未建立系卡資料，請先前往設定")
        
    badges_res = supabase.table("org_badges").select("*").eq("user_id", user_id).execute()
    
    card_data = profile_res.data[0]
    card_data["badges"] = badges_res.data
    
    current_academic_year = get_current_taiwan_academic_year()
    
    identities = card_data.get("identities", [])
    expected_grad = card_data.get("expected_graduation_year", 999)
    
    # 🚀 全面資料清洗：確保身份陣列永遠乾淨，防止雙重身份殘留
    # 規則 1：若身份含有 Student 且學號已超過畢業年限 → 替換為純 Alumni
    # 規則 2：若身份同時含有 Student 和 Alumni（不論有無超期） → 強制替換為純 Alumni
    needs_cleanup = False
    clean_identities = identities[:]
    
    has_student = "Student" in identities
    has_alumni = "Alumni" in identities
    
    if has_student and (expected_grad <= current_academic_year or has_alumni):
        # 清洗：移除 Student，確保 Alumni 存在
        clean_identities = [i for i in identities if i != "Student"]
        if "Alumni" not in clean_identities:
            clean_identities.append("Alumni")
        needs_cleanup = True
    
    if needs_cleanup:
        card_data["identities"] = clean_identities
        card_data["current_status"] = "Graduated"
        
        # 同步回寫資料庫，達成一勞永逸的資料清洗
        try:
            supabase.table("card_profiles").update({
                "identities": clean_identities,
                "current_status": "Graduated"
            }).eq("user_id", user_id).execute()
        except Exception:
            pass
            
    return card_data


@router.post("/upload-enrollment-proof")
def upload_enrollment_proof(
    academic_year: int = Form(...),
    semester: int = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    學生端/系友端：提交在校認證或系友開通申請
    """
    user_id = current_user["user_id"]
    
    existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="尚未建立數位系卡，無法上傳驗證證明。")
    
    profile = existing.data[0]
    expected_grad = profile.get("expected_graduation_year", 999)
    current_academic_year = get_current_taiwan_academic_year()
    
    # 🚀 核心安全防錯：攔截「本應為系友卻選錯申請普通學生驗證」的不合理行為
    if expected_grad <= current_academic_year:
        if academic_year != 999 or semester != 9:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"申報不合邏輯！您的學號已達畢業年限（預計 {expected_grad} 畢業），無法申請普通學生學期展延。請改為申請『系友卡認證』（學年填999，學期填9）。"
            )
    
    now_dt = datetime.now(timezone.utc)
    roc_year = now_dt.year - 1911
    
    # 學生強校驗：只允許申請當前行政學期之認證；系友特規 academic_year=999, semester=9
    if academic_year != 999 or semester != 9:
        if 2 <= now_dt.month <= 7:
            allowed_year = roc_year - 1
            allowed_semester = 2
        else:
            allowed_year = roc_year - 1 if now_dt.month == 1 else roc_year
            allowed_semester = 1
            
        if academic_year != allowed_year or semester != allowed_semester:
            raise HTTPException(
                status_code=400, 
                detail=f"申報學期不合規！當前行政時間僅允許申報 {allowed_year} 學年度第 {allowed_semester} 學期。"
            )
    
    # 3. 檢查副檔名
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg", ".heic"]:
        raise HTTPException(status_code=400, detail="不支援的檔案格式！僅限 .pdf, .png, .jpg, .jpeg, .heic 格式。")
        
    import uuid
    bucket_name = "enrollment-proofs"
    random_suffix = uuid.uuid4().hex[:8]
    save_filename = f"{user_id}_{academic_year}_{semester}_{random_suffix}{ext}"
    
    try:
        file_content = file.file.read()
        try:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
        except Exception:
            pass
            
        try:
            supabase.storage.from_(bucket_name).remove([save_filename])
        except Exception:
            pass
            
        supabase.storage.from_(bucket_name).upload(
            path=save_filename,
            file=file_content,
            file_options={"content-type": file.content_type, "x-upsert": "true"}
        )
        
        signed_url_res = supabase.storage.from_(bucket_name).create_signed_url(save_filename, 315360000)
        public_url = signed_url_res.get("signedURL") or signed_url_res.get("signedUrl")
        if not public_url:
            raise Exception("未能產生有效的 Signed URL")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"雲端證明儲存失敗：{str(e)}")
        
    # 🚀 為了解耦管理員後台審核區域：系友申請使用 'Pending_Alumni' 狀態，在校生使用 'Pending'
    v_status = "Pending_Alumni" if (academic_year == 999 and semester == 9) else "Pending"
    
    update_data = {
        "enrollment_proof_url": public_url,
        "proof_academic_year": academic_year,
        "proof_semester": semester,
        "verification_status": v_status
    }
    
    try:
        supabase.table("card_profiles").update(update_data).eq("user_id", user_id).execute()
        return {"message": "認證申請上傳成功，已進入對應的待審核隊列！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"資料庫更新失敗：{str(e)}")


@router.get("/pending-reviews")
def get_pending_reviews(current_user: dict = Depends(get_current_user)):
    """
    【活動管理員 Manager / 系統管理員 Admin 可執行】
    獲取所有待審核的申請（學生在校認證 + 系友資格認證）
    """
    require_manager_or_admin(current_user.get("role"))
    
    try:
        # 查詢所有待審核記錄（含學生 Pending 和系友 Pending_Alumni）
        pending_res = supabase.table("card_profiles").select("*").in_(
            "verification_status", ["Pending", "Pending_Alumni"]
        ).execute()
        
        if not pending_res.data:
            return {"pending_student": [], "pending_alumni": []}
        
        # 獲取這些 user_id 對應的 email
        user_ids = [p["user_id"] for p in pending_res.data]
        users_res = supabase.table("users").select("id, email").in_("id", user_ids).execute()
        user_email_map = {u["id"]: u["email"] for u in (users_res.data or [])}
        
        # 為每筆記錄補上 email
        for p in pending_res.data:
            p["email"] = user_email_map.get(p["user_id"], "（無法取得信箱）")
        
        # 分類：學生待審和系友待審
        pending_student = [p for p in pending_res.data if p["verification_status"] == "Pending"]
        pending_alumni = [p for p in pending_res.data if p["verification_status"] == "Pending_Alumni"]
        
        return {
            "pending_student": pending_student,
            "pending_alumni": pending_alumni
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取待審核列表失敗：{str(e)}")


@router.post("/verify-and-extend/{target_user_id}")
def verify_and_extend_card(
    target_user_id: str,
    semester: int,  # 1 代表上學期, 2 代表下學期, 9 代表系友終身
    action: str = "approve",  # "approve" 或 "reject"
    current_user: dict = Depends(get_current_user)
):
    """
    【活動管理員 Manager / 系統管理員 Admin 可執行】
    審核並執行展延，全面防禦選錯或髒資料漏洞
    """
    require_manager_or_admin(current_user.get("role"))
    
    if action == "reject":
        try:
            supabase.table("card_profiles").update({
                "verification_status": "Rejected"
            }).eq("user_id", target_user_id).execute()
            return {"message": "已拒絕該申請，狀態已標記為退件。"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"退件操作失敗：{str(e)}")
            
    now = datetime.now(timezone.utc)
    current_academic_year = get_current_taiwan_academic_year()
    
    # 獲取目標用戶目前的資料
    profile_res = supabase.table("card_profiles").select("*").eq("user_id", target_user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="找不到該用戶的系卡資料")
        
    profile_data = profile_res.data[0]
    expected_grad = profile_data.get("expected_graduation_year", 999)
    curr_identities = profile_data.get("identities", [])
    
    # 🚀 終極防禦：不論管理員傳入的 semester 是多少，只要系統檢測到該學號「已達畢業年限」
    # 或者是系友核准 (semester=9)，就一律執行強制轉換：
    # 徹底移除 Student，只保留 Alumni，狀態改為 Graduated
    # 確保任何情況下都不會產生雙重身份
    if semester == 9 or expected_grad <= current_academic_year:
        valid_date = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        
        # 徹底替換身份，完全移除 Student，防止髒資料堆疊
        new_identities = [i for i in curr_identities if i != "Student"]
        if "Alumni" not in new_identities:
            new_identities.append("Alumni")
            
        update_data = {
            "valid_until": valid_date.isoformat(),
            "current_status": "Graduated",
            "verification_status": "Approved",
            "last_verified_at": now.isoformat(),
            "identities": new_identities  # 確保是純 Alumni，絕不殘留 Student
        }
        msg = f"審核成功！該學號已過期或符合系友資格，系統已自動將其轉換為「永久系友卡」，並移除學生卡面。"
    else:
        # 正常的在校生展延邏輯
        if semester == 1:
            next_year = now.year + 1 if now.month >= 8 else now.year
            valid_date = datetime(next_year, 1, 31, 23, 59, 59, tzinfo=timezone.utc)
        else:
            valid_date = datetime(now.year, 7, 31, 23, 59, 59, tzinfo=timezone.utc)
            
        update_data = {
            "valid_until": valid_date.isoformat(),
            "current_status": "Active",
            "verification_status": "Approved",
            "last_verified_at": now.isoformat()
        }
        msg = f"審核成功！該學生數位系卡已順利展延至 {valid_date.strftime('%Y-%m-%d')}"
        
    try:
        supabase.table("card_profiles").update(update_data).eq("user_id", target_user_id).execute()
        return {"message": msg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"展延資料庫更新失敗：{str(e)}")