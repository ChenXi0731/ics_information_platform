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
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    current_academic_year = now.year - 1911 # 轉換為當前民國年份學年度
    
    if identity == "Student":
        try:
            from core.utils import parse_student_id_details
            degree_code, class_generation, expected_graduation_year = parse_student_id_details(raw_data["student_or_staff_id"])
            new_profile["degree_code"] = degree_code
            new_profile["class_generation"] = class_generation
            new_profile["expected_graduation_year"] = expected_graduation_year
            new_profile["current_status"] = "Active"
            
            # 🚀 自動畢業與系友判斷：若預計畢業學年 <= 當前學年度，自動追加 Alumni 身份，達成身分重疊！
            if expected_graduation_year <= current_academic_year:
                new_profile["identities"] = ["Student", "Alumni"]
            else:
                new_profile["identities"] = ["Student"]
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
    
    # 🚀 動態畢業身份升級：若已超過預計畢業年度且身分含 Student，自動追加 Alumni 身分供前端切換
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    current_academic_year = now.year - 1911
    
    identities = card_data.get("identities", [])
    expected_grad = card_data.get("expected_graduation_year", 999)
    if "Student" in identities and expected_grad <= current_academic_year:
        if "Alumni" not in identities:
            card_data["identities"] = list(set(identities + ["Alumni"]))
            
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
    
    # 2. 阻擋安全防偽防禦 (學生強校驗：只允許申請當前行政學期之認證；系友特規 academic_year=999)
    if academic_year != 999 or semester != 9:
        from datetime import datetime, timezone
        now_dt = datetime.now(timezone.utc)
        roc_year = now_dt.year - 1911
        
        # 依世新學期行政區間自動判定唯一的合法申報時間 (下學期 2/1~7/31 申報 ROC_year - 1)
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
        raise HTTPException(status_code=400, detail="不支援的檔案格式！僅限上傳 .pdf, .png, .jpg, .jpeg, .heic 格式檔案。")
        
    import uuid
    # 4. 上傳實體檔案至 Supabase Storage 雲端空間 (防止 Vercel Serverless 無狀態唯讀檔案系統限制)
    bucket_name = "enrollment-proofs"
    # 生成帶有隨機短碼的全新檔名，確保每次重新上傳，網址都會完全不同，徹底粉碎瀏覽器快取殘留！
    random_suffix = uuid.uuid4().hex[:8]
    save_filename = f"{user_id}_{academic_year}_{semester}_{random_suffix}{ext}"
    
    try:
        # 讀取檔案內容為 bytes
        file_content = file.file.read()
        
        # 嘗試在 Supabase 中自動建立 enrollment-proofs 公開 bucket
        try:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
        except Exception:
            pass
            
        # 為了避免 upsert 時發生重名衝突，先進行刪除 (如果存在) 再行上傳
        try:
            supabase.storage.from_(bucket_name).remove([save_filename])
        except Exception:
            pass
            
        # 執行上傳
        supabase.storage.from_(bucket_name).upload(
            path=save_filename,
            file=file_content,
            file_options={"content-type": file.content_type, "x-upsert": "true"}
        )
        
        # 🚀 升級方案：取得 10 年超長效 Signed URL，100% 繞過 Storage RLS 權限與 Public 開關不全的存取障礙，保證秒開預覽！
        signed_url_res = supabase.storage.from_(bucket_name).create_signed_url(save_filename, 315360000)
        public_url = signed_url_res.get("signedURL") or signed_url_res.get("signedUrl")
        if not public_url:
            raise Exception("未能產生有效的 Signed URL，請確認 Storage 權限。")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"雲端在學證明儲存失敗，請確認 Supabase Storage 是否配置：{str(e)}")
        
    # 5. 更新 Supabase 資料表，將 URL 指向雲端 Public URL
    update_data = {
        "enrollment_proof_url": public_url,
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
    
    # 計算展延過期時間（上學期有效至隔年 1/31，下學期有效至當年 7/31，若為 9 則為系友卡終身永久開通）
    if semester == 9:
        # 🚀 系友終身開通：展延至西元 9999 年底，象徵永久有效
        valid_date = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    elif semester == 1:
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
    
    # 🚀 若審核核准為系友身份 (semester=9)，確保 identities 陣列中包含 Alumni 並作為其身份組一部分寫回資料庫！
    if semester == 9:
        try:
            profile_res = supabase.table("card_profiles").select("identities").eq("user_id", target_user_id).execute()
            curr_identities = profile_res.data[0].get("identities", []) if profile_res.data else []
            # 確保 Alumni 在陣列中
            new_identities = list(set(curr_identities + ["Alumni"]))
            update_data["identities"] = new_identities
        except Exception as e:
            print(f"自動寫回 Alumni 身份失敗：{e}")
    
    try:
        supabase.table("card_profiles").update(update_data).eq("user_id", target_user_id).execute()
        return {"message": f"審核成功！該學生數位系卡已展延至 {valid_date.strftime('%Y-%m-%d')}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"展延資料庫更新失敗：{str(e)}")