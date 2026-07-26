-- 添加手机号字段到 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- 创建唯一索引（一个手机号只能注册一个账号）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone) WHERE phone != '';

-- 确保 RLS 策略允许读取 phone
-- （已有 profiles_public_read 策略，无需额外操作）

SELECT '手机号字段添加完成！' as status;
