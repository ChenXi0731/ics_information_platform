# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from core.database import supabase
from api.auth import router as auth_router
from api.card import router as card_router
from api.event import router as event_router
from api.content import router as content_router

app = FastAPI(title="ICS Information Platform API")

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
app.include_router(event_router, prefix="/api/event", tags=["活動簽到 (Event)"])
app.include_router(content_router, prefix="/api/content", tags=["內容管理 (Content)"])

@app.get("/")
def root():
    return {"message": "歡迎光臨世新大學資訊傳播學系資訊加值暨數位典藏平台API"}

# 🚀 防休眠與健康檢查路由
@app.get("/api/health")
def health_check():
    try:
        # 使用 Supabase REST API 隨便查一筆 users 的資料來測試連線
        # count="exact" 會回傳資料表總筆數，是最輕量的測試
        response = supabase.table("users").select("*", count="exact").limit(1).execute()
        return {
            "status": "healthy", 
            "database": "connected via REST API",
            "test_query_success": True
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}