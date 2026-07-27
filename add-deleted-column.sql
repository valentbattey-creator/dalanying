-- 添加 deleted 字段到 profiles 表（用于注销账户）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
-- 添加 phone 字段（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
