-- =============================================
-- 大蓝赢 - Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- =============================================

-- 1. 用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 自动创建 profile 触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  image_urls TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('tech','car','sport','game','finance','fitness','outdoor','digital')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 评论表（带 parent_id 支持二级回复）
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. 收藏表
CREATE TABLE IF NOT EXISTS saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 存储桶：在 Supabase Dashboard > Storage 中创建 post-images 和 avatars 公开存储桶

-- =============================================
-- RLS 安全策略
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- 公开可读
CREATE POLICY "公开资料可读" ON profiles FOR SELECT USING (true);
CREATE POLICY "公开帖子可读" ON posts FOR SELECT USING (true);
CREATE POLICY "公开评论可读" ON comments FOR SELECT USING (true);
CREATE POLICY "公开点赞可读" ON likes FOR SELECT USING (true);
CREATE POLICY "公开收藏可读" ON saves FOR SELECT USING (true);

-- 仅自己可写
CREATE POLICY "自己创建资料" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "自己更新资料" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "自己发帖" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自己删帖" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "自己评论" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自己删评论" ON comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "自己点赞" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自己取消点赞" ON likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "自己收藏" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自己取消收藏" ON saves FOR DELETE USING (auth.uid() = user_id);

-- Admin fields (run these manually in Supabase SQL Editor)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;
