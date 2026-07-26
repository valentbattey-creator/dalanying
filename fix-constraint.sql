-- =============================================
-- 大岚荧 - 删除 category 约束
-- 请在 Supabase SQL Editor 中运行此文件
-- =============================================

-- 删除限制性的 category CHECK 约束
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

-- 验证约束已删除
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'posts'::regclass AND contype = 'c';

SELECT '约束删除完成！' as status;
