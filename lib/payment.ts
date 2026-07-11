"use client";

import { supabase, hasSupabase } from "./supabase";
import { toast } from "sonner";

// ===== Types =====
export interface PaymentConfig {
  alipay_qr: string;    // 支付宝收款码 URL
  wechat_qr: string;    // 微信收款码 URL
  alipay_name: string;  // 支付宝显示名称
  wechat_name: string;  // 微信显示名称
}

export interface PaymentOrder {
  id: string;
  userId: string;
  userName: string;
  type: "donate" | "boost";
  amount: number;
  boostPostId?: string;
  boostDays?: number;
  paymentMethod: "alipay" | "wechat";
  proofImage: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  processedAt?: string;
  note?: string;
}

// ===== Default config =====
const DEFAULT_CONFIG: PaymentConfig = {
  alipay_qr: "",
  wechat_qr: "",
  alipay_name: "支付宝",
  wechat_name: "微信支付",
};

// ===== Config Management =====
export async function getPaymentConfig(): Promise<PaymentConfig> {
  if (hasSupabase && supabase) {
    try {
      const { data } = await supabase.from("payment_configs").select("*").single();
      if (data) return {
        alipay_qr: data.alipay_qr || "",
        wechat_qr: data.wechat_qr || "",
        alipay_name: data.alipay_name || "支付宝",
        wechat_name: data.wechat_name || "微信支付",
      };
    } catch {}
  }
  // localStorage fallback
  try {
    const saved = localStorage.getItem("dalanying_payment_config");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_CONFIG;
}

export async function savePaymentConfig(config: PaymentConfig): Promise<boolean> {
  if (hasSupabase && supabase) {
    try {
      await supabase.from("payment_configs").upsert({
        id: "default",
        alipay_qr: config.alipay_qr,
        wechat_qr: config.wechat_qr,
        alipay_name: config.alipay_name,
        wechat_name: config.wechat_name,
      }, { onConflict: "id" });
    } catch (e) {
      console.error("Supabase save config failed:", e);
    }
  }
  try {
    localStorage.setItem("dalanying_payment_config", JSON.stringify(config));
  } catch {}
  return true;
}

// ===== Order Management =====
function gid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 10); }

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem("dalanying_" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet<T>(key: string, value: T) {
  try { localStorage.setItem("dalanying_" + key, JSON.stringify(value)); } catch {}
}

export async function createPaymentOrder(params: {
  userId: string;
  userName: string;
  type: "donate" | "boost";
  amount: number;
  paymentMethod: "alipay" | "wechat";
  boostPostId?: string;
  boostDays?: number;
}): Promise<PaymentOrder> {
  const order: PaymentOrder = {
    id: gid(),
    userId: params.userId,
    userName: params.userName,
    type: params.type,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    boostPostId: params.boostPostId || "",
    boostDays: params.boostDays || 0,
    proofImage: "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (hasSupabase && supabase) {
    try {
      await supabase.from("payment_orders").insert({
        id: order.id,
        user_id: order.userId,
        user_name: order.userName,
        type: order.type,
        amount: order.amount,
        boost_post_id: order.boostPostId,
        boost_days: order.boostDays,
        payment_method: order.paymentMethod,
        proof_image: order.proofImage,
        status: order.status,
        created_at: order.createdAt,
      });
    } catch (e) {
      console.error("Supabase create order failed:", e);
    }
  }
  // localStorage fallback
  const orders = lsGet<PaymentOrder[]>("payment_orders", []);
  orders.push(order);
  lsSet("payment_orders", orders);

  return order;
}

export async function submitPaymentProof(orderId: string, proofImage: string): Promise<boolean> {
  if (hasSupabase && supabase) {
    try {
      await supabase.from("payment_orders").update({
        proof_image: proofImage,
        status: "pending",
      }).eq("id", orderId);
    } catch {}
  }
  const orders = lsGet<PaymentOrder[]>("payment_orders", []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx >= 0) {
    orders[idx].proofImage = proofImage;
    orders[idx].status = "pending";
    lsSet("payment_orders", orders);
  }
  return true;
}

export async function getPaymentOrders(userId?: string): Promise<PaymentOrder[]> {
  if (hasSupabase && supabase) {
    try {
      let query = supabase.from("payment_orders").select("*").order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      if (data) return (data as any[]).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        userName: d.user_name,
        type: d.type,
        amount: d.amount,
        boostPostId: d.boost_post_id || "",
        boostDays: d.boost_days || 0,
        paymentMethod: d.payment_method,
        proofImage: d.proof_image || "",
        status: d.status,
        createdAt: d.created_at,
        processedAt: d.processed_at,
        note: d.note,
      }));
    } catch {}
  }
  const orders = lsGet<PaymentOrder[]>("payment_orders", []);
  if (userId) return orders.filter(o => o.userId === userId);
  return orders;
}

export async function processPaymentOrder(
  orderId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<PaymentOrder | null> {
  const now = new Date().toISOString();
  
  if (hasSupabase && supabase) {
    try {
      await supabase.from("payment_orders").update({
        status,
        processed_at: now,
        note: note || null,
      }).eq("id", orderId);
    } catch {}
  }

  const orders = lsGet<PaymentOrder[]>("payment_orders", []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx >= 0) {
    orders[idx].status = status;
    orders[idx].processedAt = now;
    orders[idx].note = note || "";
    lsSet("payment_orders", orders);

    // If approved and boost, pin the post
    if (status === "approved" && orders[idx].type === "boost" && orders[idx].boostPostId) {
      await boostPost(orders[idx].boostPostId, orders[idx].boostDays || 7);
    }

    return orders[idx];
  }
  return null;
}

async function boostPost(postId: string, days: number): Promise<void> {
  if (hasSupabase && supabase) {
    try {
      const pinnedUntil = new Date(Date.now() + days * 86400000).toISOString();
      await supabase.from("posts").update({
        is_pinned: true,
        pinned_until: pinnedUntil,
      }).eq("id", postId);
    } catch {}
  }
  // localStorage
  const posts = lsGet<any[]>("posts", []);
  const idx = posts.findIndex((p: any) => p.id === postId);
  if (idx >= 0) {
    posts[idx].isPinned = true;
    posts[idx].pinnedUntil = new Date(Date.now() + days * 86400000).toISOString();
    lsSet("posts", posts);
  }
}

// ===== Upload QR code image =====
export async function uploadPaymentQR(file: File, type: "alipay" | "wechat"): Promise<string> {
  if (hasSupabase && supabase) {
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `payment/${type}_qr_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("post-images").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e) {
      console.error("Upload QR failed:", e);
      throw e;
    }
  }
  // Fallback: convert to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
