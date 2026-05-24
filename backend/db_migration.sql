-- 1. 建立學制別與學籍狀態的列舉型態（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'degree_type') THEN
        CREATE TYPE degree_type AS ENUM ('A', 'C', 'M', 'S', 'D');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
        CREATE TYPE enrollment_status AS ENUM ('Active', 'Suspended', 'Graduated');
    END IF;
END$$;

-- 2. 升級 card_profiles 資料表欄位，將單一身份字串升級為支援「身份重疊」的文字陣列
ALTER TABLE card_profiles DROP COLUMN IF EXISTS identity_type;

ALTER TABLE card_profiles 
  -- 升級為陣列，預設值為 Student，可容納多重組織身份如 ['Alumni', 'Faculty']
  ADD COLUMN IF NOT EXISTS identities TEXT[] DEFAULT '{Student}',
  -- 儲存解析後的學制首碼 (A/C/M/S/D)
  ADD COLUMN IF NOT EXISTS degree_code degree_type NOT NULL DEFAULT 'A',
  -- 當前學籍現況，預設為 Active (在學)
  ADD COLUMN IF NOT EXISTS current_status enrollment_status NOT NULL DEFAULT 'Active',
  -- 所屬學級（例如 111 級，由學號自動解析）
  ADD COLUMN IF NOT EXISTS class_generation INT NOT NULL DEFAULT 111,
  -- 預計畢業學年度（行政自動化比對基準）
  ADD COLUMN IF NOT EXISTS expected_graduation_year INT NOT NULL DEFAULT 115,
  -- 數位系卡本學期的有效期限
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE,
  -- 記錄最後一次提交在學認證的時間
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
  -- 學生端上傳的實體在學證明檔案路徑
  ADD COLUMN IF NOT EXISTS enrollment_proof_url TEXT,
  -- 申報的在學學年度
  ADD COLUMN IF NOT EXISTS proof_academic_year INT,
  -- 申報的在學學期 (1 或 2)
  ADD COLUMN IF NOT EXISTS proof_semester INT,
  -- 在學證明審核狀態 ('Unverified', 'Pending', 'Approved', 'Rejected')
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Unverified';
