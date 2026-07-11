-- ============================================
-- 大岚荧 - 支付系统数据库表
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 支付配置表（存储管理员收款码）
CREATE TABLE IF NOT EXISTS public.payment_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  alipay_qr TEXT DEFAULT '',
  wechat_qr TEXT DEFAULT '',
  alipay_name TEXT DEFAULT '支付宝',
  wechat_name TEXT DEFAULT '微信支付',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 支付订单表
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('donate', 'boost')),
  amount INTEGER NOT NULL DEFAULT 0,
  boost_post_id TEXT DEFAULT '',
  boost_days INTEGER DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('alipay', 'wechat')),
  proof_image TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 3. RLS 策略
ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- payment_configs: 所有人可读，仅管理员可写
CREATE POLICY "公开读取支付配置" ON public.payment_configs
  FOR SELECT USING (true);

CREATE POLICY "管理员写入支付配置" ON public.payment_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- payment_orders: 用户可读自己的，管理员可读所有
CREATE POLICY "用户读取自己的订单" ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员读取所有订单" ON public.payment_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "用户创建订单" ON public.payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员更新订单" ON public.payment_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. 给 posts 表添加 pinned_until 字段（如果还没有）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'pinned_until'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN pinned_until TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 5. 角色与审核系统
-- ============================================

-- 给 profiles 表添加 role 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- 6. 私信表
-- ============================================
CREATE TABLE IF NOT EXISTS public.private_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_id TEXT NOT NULL,
  to_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- 私信：参与者可读
CREATE POLICY "私信参与者可读" ON public.private_messages
  FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);

-- 私信：发送者可创建
CREATE POLICY "发送者可创建私信" ON public.private_messages
  FOR INSERT WITH CHECK (auth.uid() = from_id);

-- 管理员可读取所有私信（监控）
CREATE POLICY "管理员可读所有私信" ON public.private_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin' OR role = 'owner'))
  );
