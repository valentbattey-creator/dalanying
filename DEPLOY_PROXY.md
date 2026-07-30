# Cloudflare Worker 代理部署指南

## 目的
让国内用户不用梯子也能访问你的网站。

## 第一步：注册 Cloudflare 账号
1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册（免费）

## 第二步：创建 Worker
1. 登录后，点击左侧菜单 **Workers & Pages**
2. 点击 **Create Application**
3. 点击 **Create Worker**
4. 给 Worker 起个名字，比如 `supabase-proxy`
5. 点击 **Deploy**

## 第三步：替换代码
1. 创建完成后，点击 **Edit Code**
2. 删除编辑器里的所有代码
3. 把 `supabase-proxy-worker.js` 文件里的代码复制粘贴进去
4. 点击 **Save and Deploy**

## 第四步：获取 Worker URL
1. 部署成功后，你会看到一个 URL，类似：
   `https://supabase-proxy.你的用户名.workers.dev`
2. **复制这个 URL**

## 第五步：在 Vercel 添加环境变量
1. 打开 https://vercel.com/dashboard
2. 找到你的项目 `ni-six-psi`
3. 点击 **Settings** → **Environment Variables**
4. 添加：
   - **Name:** `NEXT_PUBLIC_SUPABASE_PROXY_URL`
   - **Value:** 你刚才复制的 Worker URL
5. 点击 **Save**

## 第六步：重新部署
1. 在 Vercel 项目页面，点击 **Deployments**
2. 点击最新部署右边的 **⋯** → **Redeploy**
3. 等待部署完成

## 测试
部署完成后，让国内朋友不用梯子试试能不能打开：
https://ni-six-psi.vercel.app

---
如果遇到问题，截图发给我！
