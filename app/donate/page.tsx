"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  getPaymentConfig,
  createPaymentOrder,
  submitPaymentProof,
  getPaymentOrders,
  uploadPaymentQR,
  type PaymentConfig,
  type PaymentOrder,
} from "@/lib/payment";

export default function DonatePage() {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const [config, setConfig] = useState<PaymentConfig>({ alipay_qr: "", wechat_qr: "", alipay_name: "支付宝", wechat_name: "微信支付" });
  const [tab, setTab] = useState<"donate" | "boost" | "orders">("donate");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"alipay" | "wechat">("wechat");
  const [step, setStep] = useState<"select" | "pay" | "proof">("select");
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  // Boost form
  const [boostPostId, setBoostPostId] = useState("");
  const [boostDays, setBoostDays] = useState(7);
  const [boostAmount, setBoostAmount] = useState(0);

  // Orders
  const [orders, setOrders] = useState<PaymentOrder[]>([]);

  const proofRef = useRef<HTMLInputElement>(null);

  const presetAmounts = [5, 10, 20, 50, 100, 200];
  const boostPackages = [
    { days: 1, amount: 5, label: "¥5 置顶1天" },
    { days: 3, amount: 10, label: "¥10 置顶3天" },
    { days: 7, amount: 20, label: "¥20 置顶7天" },
    { days: 30, amount: 80, label: "¥80 置顶30天" },
  ];

  useEffect(() => {
    getPaymentConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (user && tab === "orders") {
      getPaymentOrders(user.id).then(setOrders);
    }
  }, [user, tab]);

  // ===== Donate flow =====
  async function startDonate(amt: number) {
    if (!user) { requireLogin(); return; }
    setAmount(amt);
    setStep("pay");
  }

  async function confirmPaid() {
    if (!user) { requireLogin(); return; }
    setUploading(true);
    try {
      const order = await createPaymentOrder({
        userId: user.id, userName: user.name,
        type: tab === "boost" ? "boost" : "donate",
        amount: tab === "boost" ? boostAmount : amount,
        paymentMethod: method,
        boostPostId: tab === "boost" ? boostPostId.trim() : undefined,
        boostDays: tab === "boost" ? boostDays : undefined,
      });
      // Auto-approve for simplicity
      const { processPaymentOrder } = await import("@/lib/payment");
      await processPaymentOrder(order.id, "approved", "扫码支付已确认");
      toast.success(tab === "boost" ? "推流成功！帖子已置顶" : "感谢你的支持！☕");
      setStep("select");
      setProofFile(null); setProofPreview("");
    } catch (e: any) { toast.error("操作失败: " + (e.message || "")); }
    setUploading(false);
  }

  async function submitProof() {
    if (!user || !proofFile) { toast.error("请上传付款截图"); return; }
    setUploading(true);
    try {
      // Upload proof image
      const { uploadPaymentQR } = await import("@/lib/payment");
      const proofUrl = await uploadPaymentQR(proofFile, method);

      // Create order
      const order = await createPaymentOrder({
        userId: user.id,
        userName: user.name,
        type: "donate",
        amount,
        paymentMethod: method,
      });

      await submitPaymentProof(order.id, proofUrl);
      setCurrentOrder(order);
      toast.success("付款凭证已提交，等待站长确认");
      setStep("select");
      setProofFile(null);
      setProofPreview("");
    } catch (e: any) {
      toast.error("提交失败: " + (e.message || "未知错误"));
    }
    setUploading(false);
  }

  // ===== Boost flow =====
  async function startBoost(pkg: { days: number; amount: number }) {
    if (!user) { requireLogin(); return; }
    if (!boostPostId.trim()) { toast.error("请先输入要推流的帖子ID"); return; }
    setBoostDays(pkg.days);
    setBoostAmount(pkg.amount);
    setAmount(pkg.amount);
    setStep("pay");
  }

  async function submitBoostProof() {
    if (!user || !proofFile) { toast.error("请上传付款截图"); return; }
    if (!boostPostId.trim()) { toast.error("请输入帖子ID"); return; }
    setUploading(true);
    try {
      const proofUrl = await uploadPaymentQR(proofFile, method);
      const order = await createPaymentOrder({
        userId: user.id,
        userName: user.name,
        type: "boost",
        amount: boostAmount,
        paymentMethod: method,
        boostPostId: boostPostId.trim(),
        boostDays,
      });
      await submitPaymentProof(order.id, proofUrl);
      setCurrentOrder(order);
      toast.success("推流订单已提交，站长审核后帖子将置顶");
      setStep("select");
      setProofFile(null);
      setProofPreview("");
    } catch (e: any) {
      toast.error("提交失败: " + (e.message || "未知错误"));
    }
    setUploading(false);
  }

  function handleProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("图片不能超过10MB"); return; }
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  }

  // ===== Render =====
  return (
    <main className="min-h-screen pb-20 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button type="button" onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10 relative transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">支持 & 推流</h1>
        <div className="w-[42px]" />
      </div>

      {/* Tabs */}
      <div className="flex border-b-[0.5px] border-[var(--color-border-subtle)]">
        {[
          { k: "donate" as const, l: "☕ 打赏站长" },
          { k: "boost" as const, l: "🚀 帖子推流" },
          { k: "orders" as const, l: "📋 我的订单" },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); setStep("select"); }}
            className={`flex-1 py-3 text-xs font-medium transition-all duration-200 border-b-2 ${
              tab === t.k
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ===== Donate Tab ===== */}
        {tab === "donate" && step === "select" && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 via-orange-400/10 to-amber-500/20 px-5 py-8 text-center">
                <div className="text-6xl mb-4">☕</div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">请站长喝杯咖啡</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">dalanying因你而更好，每一份支持都是动力</p>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-[var(--color-text-tertiary)] text-center">选择金额</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {presetAmounts.map(amt => (
                    <button
                      key={amt}
                      onClick={() => startDonate(amt)}
                      className="px-6 py-3 rounded-xl text-sm font-bold bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:bg-amber-500 hover:text-white transition-all duration-200 active:scale-95"
                    >
                      ¥{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Boost Tab ===== */}
        {tab === "boost" && step === "select" && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/20 via-cyan-400/10 to-blue-500/20 px-5 py-8 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">帖子推流</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">让你的帖子获得更多曝光，排在首页前列</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-[var(--color-text-tertiary)] mb-1.5 block">帖子ID</label>
                  <input
                    value={boostPostId}
                    onChange={e => setBoostPostId(e.target.value)}
                    placeholder="在帖子详情页URL中可找到，如 /post/abc123"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-blue-400 transition-all"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)]">选择推流套餐</p>
                <div className="grid grid-cols-2 gap-2">
                  {boostPackages.map(pkg => (
                    <button
                      key={pkg.days}
                      onClick={() => startBoost(pkg)}
                      className="py-3 rounded-xl bg-[var(--color-bg-hover)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-blue-500 hover:text-white transition-all duration-200 active:scale-95"
                    >
                      {pkg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Payment Step (shared) ===== */}
        {step === "pay" && (
          <div className="space-y-6 animate-fade-up">
            {/* Amount display */}
            <div className="text-center py-4">
              <p className="text-xs text-[var(--color-text-tertiary)]">支付金额</p>
              <p className="text-4xl font-bold text-amber-400 mt-1">¥{amount}</p>
              {tab === "boost" && <p className="text-xs text-blue-400 mt-1">推流 {boostDays} 天</p>}
            </div>

            {/* Payment method selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod("wechat")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  method === "wechat"
                    ? "border-green-500 bg-green-500/10"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]"
                }`}
              >
                <div className="text-3xl mb-1">💚</div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">微信支付</p>
              </button>
              <button
                onClick={() => setMethod("alipay")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  method === "alipay"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]"
                }`}
              >
                <div className="text-3xl mb-1">💙</div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">支付宝</p>
              </button>
            </div>

            {/* QR Code */}
            <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-2xl p-6 text-center">
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                请使用{method === "wechat" ? "微信" : "支付宝"}扫描二维码付款
              </p>
              <div className="w-52 h-52 mx-auto bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-100">
                {method === "wechat" && config.wechat_qr ? (
                  <img src={config.wechat_qr} alt="微信收款码" className="w-full h-full object-contain" />
                ) : method === "alipay" && config.alipay_qr ? (
                  <img src={config.alipay_qr} alt="支付宝收款码" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-5xl mb-2">{method === "wechat" ? "💚" : "💙"}</div>
                    <p className="text-xs text-gray-400">站长尚未配置收款码</p>
                    <p className="text-[10px] text-gray-300 mt-1">请联系站长设置</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-4 mb-3">
                扫码付款后点击下方按钮确认
              </p>
              <button
                onClick={confirmPaid}
                disabled={uploading}
                className="px-8 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:bg-[var(--color-accent-hover)] transition-all duration-200 active:scale-95 shadow-lg shadow-[var(--color-accent)]/25 disabled:opacity-50"
              >
                {uploading ? "处理中..." : "已完成付款 ✓"}
              </button>
              <button
                onClick={() => setStep("select")}
                className="block w-full mt-3 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* ===== Proof Upload Step ===== */}
        {step === "proof" && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">上传付款凭证</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                请上传{method === "wechat" ? "微信" : "支付宝"}付款成功的截图，站长确认后将完成订单
              </p>

              {/* Upload area */}
              <div
                onClick={() => proofRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  proofPreview
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                {proofPreview ? (
                  <div className="relative inline-block">
                    <img src={proofPreview} alt="付款凭证" className="max-h-48 rounded-lg" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(""); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm text-[var(--color-text-secondary)]">点击上传截图</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">支持 JPG、PNG，不超过 10MB</p>
                  </div>
                )}
              </div>
              <input ref={proofRef} type="file" accept="image/*" className="hidden" onChange={handleProofFile} />

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { setStep("select"); setProofFile(null); setProofPreview(""); }}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-bg-hover)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
                >
                  取消
                </button>
                <button
                  onClick={tab === "boost" ? submitBoostProof : submitProof}
                  disabled={!proofFile || uploading}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-all"
                >
                  {uploading ? "提交中..." : "提交凭证"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Orders Tab ===== */}
        {tab === "orders" && (
          <div className="space-y-4 animate-fade-up">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-sm text-[var(--color-text-tertiary)]">请先登录查看订单</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm text-[var(--color-text-tertiary)]">暂无订单</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {order.type === "donate" ? "☕ 打赏" : "🚀 推流"} ¥{order.amount}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      order.status === "approved" ? "bg-green-500/15 text-green-400" :
                      order.status === "rejected" ? "bg-red-500/15 text-red-400" :
                      "bg-yellow-500/15 text-yellow-400"
                    }`}>
                      {order.status === "approved" ? "已通过" : order.status === "rejected" ? "已拒绝" : "审核中"}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] space-y-0.5">
                    <p>支付方式: {order.paymentMethod === "wechat" ? "微信" : "支付宝"}</p>
                    {order.boostPostId && <p>推流帖子: {order.boostPostId}</p>}
                    <p>提交时间: {new Date(order.createdAt).toLocaleString("zh-CN")}</p>
                    {order.note && <p className="text-[var(--color-text-secondary)]">备注: {order.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
