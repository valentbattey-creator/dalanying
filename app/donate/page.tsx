"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData, type Post } from "@/lib/store";
import { getPaymentConfig, createPaymentOrder, type PaymentConfig } from "@/lib/payment";
import { toast } from "sonner";

const BOOST_PACKAGES = [
  { days: 3, amount: 5, label: "3天", price: "¥5" },
  { days: 7, amount: 10, label: "7天", price: "¥10", popular: true },
  { days: 15, amount: 20, label: "15天", price: "¥20" },
  { days: 30, amount: 50, label: "30天", price: "¥50" },
];

export default function DonatePage() {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { posts, updatePost } = useData();
  const [config, setConfig] = useState<PaymentConfig>({ alipay_qr: "", wechat_qr: "", alipay_name: "支付宝", wechat_name: "微信支付" });
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<typeof BOOST_PACKAGES[0] | null>(null);
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [payMethod, setPayMethod] = useState<"wechat" | "alipay">("wechat");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPaymentConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (user) {
      setUserPosts(posts.filter(p => p.authorId === user.id && !p.isAnnouncement));
    }
  }, [user, posts]);

  function handleSelectPkg(pkg: typeof BOOST_PACKAGES[0]) {
    if (!user) { requireLogin(); return; }
    if (!selectedPost) { toast.error("请先选择帖子"); return; }
    setSelectedPkg(pkg);
    setStep("pay");
  }

  async function handleConfirmPay() {
    if (!user || !selectedPkg || !selectedPost) return;
    setSubmitting(true);
    try {
      // Create order
      await createPaymentOrder({
        userId: user.id,
        userName: user.name,
        type: "boost",
        amount: selectedPkg.amount,
        paymentMethod: payMethod,
        boostPostId: selectedPost,
        boostDays: selectedPkg.days,
      });
      // Pin the post immediately (站长 can revoke if needed)
      await updatePost(selectedPost, { isPinned: true });
      toast.success(`推流成功！帖子已置顶 ${selectedPkg.days} 天`);
      setStep("done");
    } catch (e: any) {
      toast.error("操作失败: " + (e.message || "未知错误"));
    }
    setSubmitting(false);
  }

  const hasQR = payMethod === "wechat" ? !!config.wechat_qr : !!config.alipay_qr;
  const qrUrl = payMethod === "wechat" ? config.wechat_qr : config.alipay_qr;

  return (
    <main className="min-h-screen pb-20 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(9,9,11,0.85)", borderBottom: "0.5px solid var(--color-border-subtle)" }} className="h-11 flex items-center px-4">
        <button onClick={() => { if (step === "pay") setStep("select"); else router.back(); }} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">推流帖子</h1>
        <div className="w-[42px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Step 1: Select post + package */}
        {step === "select" && (
          <div className="space-y-4 animate-fade-up">
            {!user ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">🔐</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">请先登录</p>
                <button onClick={requireLogin} className="btn-primary px-6 py-2 rounded-xl text-sm">去登录</button>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">📝</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">你还没有发过帖子</p>
                <button onClick={() => router.push("/create")} className="btn-primary px-6 py-2 rounded-xl text-sm">去发帖</button>
              </div>
            ) : (
              <>
                {/* Select post */}
                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">选择帖子</label>
                  <div className="mt-2 space-y-2">
                    {userPosts.map(p => (
                      <div key={p.id} onClick={() => setSelectedPost(p.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedPost === p.id ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"}`}>
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] line-clamp-1">{p.title}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{p.content?.substring(0, 40)}...</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select package */}
                {selectedPost && (
                  <div>
                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">选择套餐</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {BOOST_PACKAGES.map(pkg => (
                        <button key={pkg.days} onClick={() => handleSelectPkg(pkg)}
                          className="relative p-3 rounded-xl border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-all text-left">
                          {pkg.popular && <span className="absolute -top-2 -right-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white font-medium">推荐</span>}
                          <p className="text-lg font-bold text-[var(--color-text-primary)]">{pkg.price}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">置顶 {pkg.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Pay */}
        {step === "pay" && selectedPkg && (
          <div className="space-y-4 animate-fade-up">
            {/* Order summary */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-primary)]">推流费用</span>
                <span className="text-lg font-bold text-[var(--color-accent)]">{selectedPkg.price}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">帖子置顶 {selectedPkg.days} 天</p>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">支付方式</label>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setPayMethod("wechat")}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${payMethod === "wechat" ? "border-green-500 bg-green-500/10 text-green-400" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"}`}>
                  💚 微信支付
                </button>
                <button onClick={() => setPayMethod("alipay")}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${payMethod === "alipay" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"}`}>
                  💙 支付宝
                </button>
              </div>
            </div>

            {/* QR code */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 text-center">
              {hasQR ? (
                <>
                  <img src={qrUrl} alt="收款码" className="w-48 h-48 mx-auto rounded-xl object-contain mb-3" style={{ border: "1px solid var(--color-border-subtle)" }} />
                  <p className="text-xs text-[var(--color-text-tertiary)]">请扫码支付 {selectedPkg.price}</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">📷</div>
                  <p className="text-sm text-[var(--color-text-tertiary)]">站长尚未配置收款码</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">请联系站长开通支付功能</p>
                </>
              )}
            </div>

            {/* Confirm button */}
            <button onClick={handleConfirmPay} disabled={submitting}
              className="btn-primary w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all">
              {submitting ? "处理中..." : "我已完成支付，确认推流"}
            </button>

            <p className="text-[10px] text-center text-[var(--color-text-tertiary)]">
              点击确认后帖子将立即置顶，站长可审核订单
            </p>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="text-center py-16 space-y-4 animate-fade-up">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">推流成功！</h2>
            <p className="text-sm text-[var(--color-text-tertiary)]">你的帖子已在首页置顶展示</p>
            <div className="flex gap-3 justify-center pt-4">
              <button onClick={() => router.push("/")} className="px-6 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all">
                回到首页
              </button>
              <button onClick={() => { setStep("select"); setSelectedPost(""); setSelectedPkg(null); }}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm">
                继续推流
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
