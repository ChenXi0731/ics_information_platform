# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.database import supabase
from api.auth import router as auth_router
from api.card import router as card_router
from api.event import router as event_router
from api.content import router as content_router
from api.admin import router as admin_router
from api.deps import get_current_user, require_admin_only
import os
from core.utils import UPLOAD_DIR

# 確保 uploads 目錄存在並掛載為靜態路由
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception as e:
    print(f"無法建立 UPLOAD_DIR: {e}")

app = FastAPI(title="ICS Information Platform API")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 允許前端 React 跨網域存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["身分驗證 (Auth)"])
app.include_router(card_router, prefix="/api/card", tags=["數位系卡 (Card)"])
app.include_router(admin_router, prefix="/api", tags=["管理員工具 (Admin)"])
app.include_router(event_router, prefix="/api/event", tags=["活動簽到 (Event)"])
app.include_router(content_router, prefix="/api/content", tags=["內容管理 (Content)"])

@app.get("/")
def root():
    return {"message": "歡迎光臨世新大學資訊傳播學系資訊加值暨數位典藏平台API"}

# 🚀 自動畢業偵測排程 API (於每年 8 月 31 日由外部排程或最高管理員觸發)
@app.post("/api/cron/graduation-detect")
def trigger_graduation_detect(current_user: dict = Depends(get_current_user)):
    """
    【僅限系統管理員 Admin 可觸發】
    每年 8 月 31 日執行自動畢業偵測排程
    對應 expected_graduation_year <= 當前學年度之在校生，實施身分完全替換與卡面凍結
    """
    require_admin_only(current_user.get("role"))
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    # 世新學年度判定基準以 8/31 作為學年度的畢業偵測分界
    current_academic_year = now.year - 1911
    
    try:
        # 依需求說明書：只有當符合畢業年限且目前 current_status = 'Active'（在學非休學）的學生才進行自動轉換
        profiles_res = supabase.table("card_profiles").select("*").eq("current_status", "Active").execute()
        profiles = profiles_res.data or []
        
        updated_count = 0
        for p in profiles:
            identities = p.get("identities", [])
            expected_graduation = p.get("expected_graduation_year", 999)
            
            # 當偵測到需要畢業的 Student 身分時
            if "Student" in identities and expected_graduation <= current_academic_year:
                # 🚀 核心改造：不再追加，而是「完全替換」身份！
                # 移除 identities 陣列中的 'Student' 標籤，並確保塞入 'Alumni'
                clean_identities = [i for i in identities if i != "Student"]
                if "Alumni" not in clean_identities:
                    clean_identities.append("Alumni")
                
                # 🚀 同步更新狀態鏈：
                # 1. 變更 identities 為過濾後的純系友陣列
                # 2. 將 current_status 改為 'Graduated' (已畢業)
                # 3. 將 valid_until 設為西元 9999 年底（象徵系友卡終身永久有效）
                valid_date = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
                
                supabase.table("card_profiles").update({
                    "identities": clean_identities,
                    "current_status": "Graduated",
                    "valid_until": valid_date.isoformat()
                }).eq("user_id", p["user_id"]).execute()
                
                updated_count += 1
                    
        return {
            "status": "success",
            "message": f"自動化畢業身份流轉程序完成！共將 {updated_count} 位學生的身份成功從 'Student' 安全移轉為 'Alumni'，並將卡片修正為永久系友卡。",
            "current_academic_year": current_academic_year
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"自動畢業偵測執行失敗：{str(e)}")

# 🚀 防休眠與健康檢查路由
@app.get("/api/health")
def health_check():
    try:
        response = supabase.table("users").select("*", count="exact").limit(1).execute()
        return {
            "status": "healthy", 
            "database": "connected via REST API",
            "test_query_success": True
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}