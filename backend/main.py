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
    對應 expected_graduation_year <= 當前學年度之在校生，自動在 identities 追加 'Alumni'
    """
    require_admin_only(current_user.get("role"))
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    # 世新學年度判定基準以 8/31 作為學年度的畢業偵測分界
    current_academic_year = now.year - 1911
    
    try:
        # 獲取所有處於 Active 狀態的卡片
        profiles_res = supabase.table("card_profiles").select("*").eq("current_status", "Active").execute()
        profiles = profiles_res.data or []
        
        updated_count = 0
        for p in profiles:
            identities = p.get("identities", [])
            expected_graduation = p.get("expected_graduation_year", 999)
            
            if "Student" in identities and expected_graduation <= current_academic_year:
                if "Alumni" not in identities:
                    # 追加 Alumni 到 identities 陣列
                    new_identities = list(set(identities + ["Alumni"]))
                    supabase.table("card_profiles").update({
                        "identities": new_identities
                    }).eq("user_id", p["user_id"]).execute()
                    updated_count += 1
                    
        return {
            "status": "success",
            "message": f"畢業偵測與標籤自動化程序完成！共將 {updated_count} 位學生的身分追加了 'Alumni' 標籤。",
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