"use client";

import { useState, useRef } from "react";
import { useAuth, updateProfile } from "@/lib/auth"; import { uploadAvatar } from "@/lib/data";
import { toast } from "sonner";

export default function ProfileSetup() {
  const { user, showProfileSetup, setShowProfileSetup, updateUserProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!showProfileSetup || !user) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!nickname.trim()) { toast.error("请输入昵称"); return; }
    if (nickname.trim().length < 2) { toast.error("昵称至少2个字符"); return; }
    setSaving(true);
    try {
      const u = user!; let avatarUrl = u.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, u.id);
      }
      const ok = await updateProfile(u.id, { nickname: nickname.trim(), avatar_url: avatarUrl });
      if (ok) {
        updateUserProfile({ name: nickname.trim(), avatar: avatarUrl });
        toast.success("个人资料更新成功！");
        setShowProfileSetup(false);
      } else {
        toast.error("保存失败，请重试");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    }
    setSaving(false);
  }

  function handleSkip() {
    setShowProfileSetup(false);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border-default)] rounded-2xl p-6 shadow-2xl animate-fade-up z-10">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">完善个人资料</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">设置昵称和头像，让其他人认识你</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">头像</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full mt-1 py-3 rounded-xl border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-300 text-xs"
            >
              {avatarPreview ? "点击更换头像" : "点击上传头像"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="你的昵称（至少2个字符）"
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSkip}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-border-default)] text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all duration-300"
            >
              稍后再说
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !nickname.trim() || nickname.trim().length < 2}
              className="btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {saving ? "保存中..." : "完成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
