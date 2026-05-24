# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from api.schemas import NewsCreate, StoreCreate
from api.deps import get_current_user, require_manager_or_admin, require_admin_only
from core.database import supabase

router = APIRouter()

def check_admin_or_manager(current_user: dict = Depends(get_current_user)):
    """驗證使用者角色是否為系統管理員或活動管理員"""
    require_manager_or_admin(current_user.get("role"))
    return current_user

@router.get("")
def get_all_content():
    """獲取首頁所需的所有動態內容（最新消息與特約商店）"""
    try:
        # 1. 取得最新消息
        news_res = supabase.table("news").select("*").order("created_at", desc=True).execute()
        
        # 若資料表為空，自動寫入預設首頁消息
        if not news_res.data:
            default_news = [
                {
                    "title": "2026 資傳迎新宿營開始報名！",
                    "category": "活動資訊",
                    "content": "一年一度的迎新宿營來囉！歡迎大一新生與系學會夥伴共同參與，名額有限，報名從速！"
                },
                {
                    "title": "數位畢業專題展覽籌備小組招募中",
                    "category": "學術公告",
                    "content": "誠徵對視覺設計、展場規劃、公關推廣有興趣的系上同學加入我們！"
                },
                {
                    "title": "資傳系與周邊優質店家特約合作正式開跑",
                    "category": "系友福利",
                    "content": "即日起出示「世新資傳數位系卡」，即可享有校區周邊特約商家獨家優惠。"
                }
            ]
            supabase.table("news").insert(default_news).execute()
            news_res = supabase.table("news").select("*").order("created_at", desc=True).execute()

        # 2. 取得特約合作商店
        stores_res = supabase.table("cooperative_stores").select("*").order("created_at", desc=True).execute()
        
        # 若資料表為空，自動寫入預設特約商店
        if not stores_res.data:
            default_stores = [
                {
                    "name": "翠谷特調咖啡館",
                    "discount": "憑數位系卡享全品項 9 折",
                    "icon": "☕"
                },
                {
                    "name": "文薈堂創意文具",
                    "discount": "購買系上指定文具享 85 折",
                    "icon": "🎨"
                },
                {
                    "name": "校門口美味廚房",
                    "discount": "內用免費加麵/加飯一次",
                    "icon": "🍛"
                }
            ]
            supabase.table("cooperative_stores").insert(default_stores).execute()
            stores_res = supabase.table("cooperative_stores").select("*").order("created_at", desc=True).execute()

        return {
            "news": news_res.data,
            "stores": stores_res.data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"獲取/寫入 Supabase 資料失敗，請確認資料表 'news' 與 'cooperative_stores' 存在。錯誤詳情：{str(e)}"
        )


# ==========================================
# 📢 最新消息後台管理端 API (CRUD)
# ==========================================

@router.post("/news", status_code=status.HTTP_201_CREATED)
def create_news(news: NewsCreate, admin_user: dict = Depends(check_admin_or_manager)):
    """新增一筆最新消息"""
    try:
        res = supabase.table("news").insert(news.model_dump()).execute()
        return {"message": "最新消息新增成功！", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"新增失敗：{str(e)}")

@router.put("/news/{id}")
def update_news(id: int, news: NewsCreate, admin_user: dict = Depends(check_admin_or_manager)):
    """編輯一筆最新消息"""
    try:
        res = supabase.table("news").update(news.model_dump()).eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="找不到指定的消息，無法編輯")
        return {"message": "最新消息編輯成功！", "data": res.data[0]}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"編輯失敗：{str(e)}")

@router.delete("/news/{id}")
def delete_news(id: int, admin_user: dict = Depends(check_admin_or_manager)):
    """刪除一筆最新消息"""
    try:
        res = supabase.table("news").delete().eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="找不到指定的消息，無法刪除")
        return {"message": "最新消息刪除成功！"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刪除失敗：{str(e)}")


# ==========================================
# 🤝 特約合作商店後台管理端 API (CRUD)
# ==========================================

@router.post("/stores", status_code=status.HTTP_201_CREATED)
def create_store(store: StoreCreate, admin_user: dict = Depends(check_admin_or_manager)):
    """新增一間特約商店"""
    try:
        res = supabase.table("cooperative_stores").insert(store.model_dump()).execute()
        return {"message": "特約商店新增成功！", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"新增失敗：{str(e)}")

@router.put("/stores/{id}")
def update_store(id: int, store: StoreCreate, admin_user: dict = Depends(check_admin_or_manager)):
    """編輯一間特約商店"""
    try:
        res = supabase.table("cooperative_stores").update(store.model_dump()).eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="找不到指定的特約商店，無法編輯")
        return {"message": "特約商店編輯成功！", "data": res.data[0]}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"編輯失敗：{str(e)}")

@router.delete("/stores/{id}")
def delete_store(id: int, admin_user: dict = Depends(check_admin_or_manager)):
    """刪除一間特約商店"""
    try:
        res = supabase.table("cooperative_stores").delete().eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="找不到指定的特約商店，無法刪除")
        return {"message": "特約商店刪除成功！"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刪除失敗：{str(e)}")


# ==========================================
# 👥 使用者權限後台管理端 API (GET, PUT)
# ==========================================

def check_admin(current_user: dict = Depends(get_current_user)):
    """驗證使用者角色是否為最高權限系統管理員 Admin"""
    require_admin_only(current_user.get("role"))
    return current_user

@router.get("/users")
def get_all_users(admin_user: dict = Depends(check_admin)):
    """獲取平台所有註冊帳號列表以及其對應的數位系卡身分"""
    try:
        # 1. 獲取所有 users
        users_res = supabase.table("users").select("id, email, system_role, created_at").order("created_at", desc=True).execute()
        users = users_res.data or []
        
        # 2. 獲取所有 card_profiles
        profiles_res = supabase.table("card_profiles").select("*").execute()
        profiles = {p["user_id"]: p for p in (profiles_res.data or [])}
        
        # 3. 在記憶體中進行關聯合併
        for u in users:
            u_id = u["id"]
            if u_id in profiles:
                profile_data = profiles[u_id]
                # 為了前端相容性，動態映射 identity_type 欄位
                identities = profile_data.get("identities", [])
                profile_data["identity_type"] = identities[0] if identities else "Student"
                u["card_profile"] = profile_data
            else:
                u["card_profile"] = None
                
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取使用者與系卡列表失敗：{str(e)}")


@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, payload: dict, admin_user: dict = Depends(check_admin)):
    """編輯使用者的權限角色組與系卡身分組"""
    new_role = payload.get("system_role")
    new_identity = payload.get("identity_type")
    
    if new_role and new_role not in ["Admin", "Manager", "Contributor"]:
        raise HTTPException(status_code=400, detail="無效的權限角色，必須為 'Admin', 'Manager' 或 'Contributor'")
        
    if new_identity and new_identity not in ["Student", "Faculty", "Alumni"]:
        raise HTTPException(status_code=400, detail="無效的系卡身分，必須為 'Student', 'Faculty' 或 'Alumni'")
    
    try:
        # 1. 更新系統角色組 (system_role)
        if new_role:
            supabase.table("users").update({"system_role": new_role}).eq("id", user_id).execute()
            
        # 2. 更新或新建數位系卡身分 (identities)
        if new_identity:
            # 檢查是否已建卡
            existing = supabase.table("card_profiles").select("*").eq("user_id", user_id).execute()
            if existing.data:
                # 更新為只含有該身分的陣列，確保原前端相容，後台也可進階修改
                supabase.table("card_profiles").update({"identities": [new_identity]}).eq("user_id", user_id).execute()
            else:
                # 該用戶尚未建立數位系卡，管理員直接為其代建初始檔案以配置身分組
                new_profile = {
                    "user_id": user_id,
                    "name": "（管理員代建）",
                    "student_or_staff_id": "未填寫",
                    "identities": [new_identity],
                    "degree_code": "A",
                    "current_status": "Active",
                    "class_generation": 111,
                    "expected_graduation_year": 115,
                    "entry_year": 111
                }
                supabase.table("card_profiles").insert(new_profile).execute()
                
        return {"message": "使用者權限組與數位系卡身分更新成功！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失敗：{str(e)}")

