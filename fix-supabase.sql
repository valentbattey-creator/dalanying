-- =============================================
-- 大岚荧 - Supabase 修复脚本 v3
-- 请在 Supabase SQL Editor 中运行此文件
-- =============================================

-- 添加缺失列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- 修复 category 约束
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE posts ADD CONSTRAINT posts_category_check 
  CHECK (category IN ('tech','car','sport','game','finance','fitness','outdoor','digital'));

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- 删除所有旧策略
DROP POLICY IF EXISTS "公开帖子可读" ON posts;
DROP POLICY IF EXISTS "自己发帖" ON posts;
DROP POLICY IF EXISTS "自己删帖" ON posts;
DROP POLICY IF EXISTS "posts_public_read" ON posts;
DROP POLICY IF EXISTS "posts_auth_insert" ON posts;
DROP POLICY IF EXISTS "posts_auth_delete" ON posts;
DROP POLICY IF EXISTS "posts_auth_update" ON posts;

DROP POLICY IF EXISTS "公开资料可读" ON profiles;
DROP POLICY IF EXISTS "自己创建资料" ON profiles;
DROP POLICY IF EXISTS "自己更新资料" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;

DROP POLICY IF EXISTS "公开评论可读" ON comments;
DROP POLICY IF EXISTS "自己评论" ON comments;
DROP POLICY IF EXISTS "自己删评论" ON comments;
DROP POLICY IF EXISTS "comments_public_read" ON comments;
DROP POLICY IF EXISTS "comments_auth_insert" ON comments;
DROP POLICY IF EXISTS "comments_auth_delete" ON comments;

DROP POLICY IF EXISTS "公开点赞可读" ON likes;
DROP POLICY IF EXISTS "自己点赞" ON likes;
DROP POLICY IF EXISTS "自己取消点赞" ON likes;
DROP POLICY IF EXISTS "likes_public_read" ON likes;
DROP POLICY IF EXISTS "likes_auth_insert" ON likes;
DROP POLICY IF EXISTS "likes_auth_delete" ON likes;

DROP POLICY IF EXISTS "公开收藏可读" ON saves;
DROP POLICY IF EXISTS "自己收藏" ON saves;
DROP POLICY IF EXISTS "自己取消收藏" ON saves;

-- 创建 posts 策略
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_auth_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_auth_delete" ON posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "posts_auth_update" ON posts FOR UPDATE USING (auth.uid() = user_id);

-- 创建 profiles 策略
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 创建 comments 策略
CREATE POLICY "comments_public_read" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_auth_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_auth_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 创建 likes 策略
CREATE POLICY "likes_public_read" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_auth_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_auth_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- 创建 saves 策略
CREATE POLICY "saves_public_read" ON saves FOR SELECT USING (true);
CREATE POLICY "saves_auth_insert" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_auth_delete" ON saves FOR DELETE USING (auth.uid() = user_id);

-- 更新触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

SELECT '修复完成！' as status;
