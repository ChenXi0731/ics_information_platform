import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from supabase import create_client, Client

# 載入 .env 檔案
load_dotenv()

# 讀取 URL 與 Key
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("找不到 SUPABASE_URL 或 SUPABASE_KEY，請檢查 .env 檔案！")

# 建立 Supabase 客戶端 (之後所有的 API 路由都會直接引入這個 supabase 物件)
supabase: Client = create_client(url, key)