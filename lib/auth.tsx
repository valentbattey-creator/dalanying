"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase, hasSupabase } from "./supabase";

// ===== Types =====
export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  requireLogin: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  setShowLoginModal: (show: boolean) => void;
  showLoginModal: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// ===== Email Validation =====
// Step 1: Basic format check (must have @ and dot in the right places)
const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 2: Disposable email domains (blocklist)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "yopmail.com", "throwaway.email", "sharklasers.com", "trashmail.com",
  "temp-mail.org", "fakeinbox.com", "emailondeck.com", "spam4.me",
  "dispostable.com", "maildrop.cc", "getnada.com", "inboxkitten.com",
  "mailsac.com", "tempinbox.com", "moakt.com", "emailfake.com",
  "tempmail.net", "tmpmail.org", "disposablemail.com", "0wnd.net",
  "0wnd.org", "10minut.com.pl", "1blackmoon.com", "1ce.us",
  "33mail.com", "3d-painting.com", "4warding.com", "4warding.net",
  "4warding.org", "60minutemail.com", "6url.com", "75hosting.com",
  "7days-printing.com", "7tags.com", "9ox.net", "a-bc.net",
  "anonmails.de", "antichef.com", "antichef.net", "baxomale.ht.cx",
  "beefmilk.com", "binkmail.com", "bio-muesli.net", "bobmail.info",
  "bodhi.lawlita.com", "bofthew.com", "brefmail.com", "broadbandninja.com",
  "bsnow.net", "bugmenot.com", "bumpymail.com", "casualdx.com",
  "centermail.com", "centermail.net", "chammy.info", "cheatmail.de",
  "cool.fr.nf", "correo.blogos.net", "cosmorph.com", "courriel.fr.nf",
  "cubiclink.com", "curryworld.de", "cust.in", "dacoolest.com",
  "dandikmail.com", "dayrep.com", "deadaddress.com", "deadspam.com",
  "despam.it", "devnullmail.com", "dfgh.net", "digitalsanctuary.com",
  "discard.email", "discardmail.com", "discardmail.de", "dispomail.eu",
  "dodsi.com", "dontsendmespam.de", "dump-email.info", "e4ward.com",
  "easytrashmail.com", "einrot.com", "einrot.de", "email60.com",
  "emailgo.de", "emailias.com", "emaillime.com", "emailsensei.com",
  "emailtemporanea.com", "emailtemporanea.net", "emailtemporar.ro",
  "emailthe.net", "emailtmp.com", "ephemail.net", "etranquil.com",
  "etranquil.net", "etranquil.org", "fakeinbox.info", "fastacura.com",
  "fastchevy.com", "fastchrysler.com", "fastkawasaki.com", "fastmazda.com",
  "fastmitsubishi.com", "fastnissan.com", "fastsubaru.com", "fastsuzuki.com",
  "fasttoyota.com", "fastyamaha.com", "filzmail.com", "fivemail.de",
  "fleckens.hu", "flemail.ru", "flyspam.com", "footard.com",
  "forgetmail.com", "fr33mail.info", "frapmail.com", "friendlymail.co.uk",
  "front14.org", "fuckingduh.com", "fudgerub.com", "garliclife.com",
  "gehensiemirnichtaufdensack.de", "get2mail.fr", "getairmail.com",
  "getmails.eu", "getonemail.com", "ghosttexter.de", "giantmail.de",
  "girlsundertheinfluence.com", "gishpuppy.com", "gmial.com",
  "goemailgo.com", "gorillaswithdirtyarmpits.com", "gotmail.com",
  "gotmail.org", "gotti.otherinbox.com", "great-host.in",
  "grr.la", "gsrv.co.uk", "guerrillamail.biz", "guerrillamail.com",
  "guerrillamail.de", "guerrillamail.info", "guerrillamail.net",
  "guerrillamail.org", "guerrillamailblock.com", "gustr.com",
  "h.mintemail.com", "h8s.org", "hacccc.com", "haltospam.com",
  "harakirimail.com", "hartbot.de", "hat-geld.de", "hatespam.org",
  "hellodreamworld.com", "herp.in", "hidemail.de", "hmail.us",
  "hochsitze.com", "hopemail.biz", "hotpop.com", "hulapla.de",
  "ieatspam.eu", "ieatspam.info", "ihateyoualot.info", "imails.info",
  "inbax.tk", "inbox.si", "inboxalias.com", "inboxclean.com",
  "inboxclean.org", "infocom.zp.ua", "instant-mail.de", "ip6.li",
  "irish2me.com", "iwi.net", "jil.kiev.ua", "junk1e.com",
  "kasmail.com", "kaspop.com", "keepmymail.com", "klassmaster.com",
  "klassmaster.net", "klzlk.com", "kulturbetrieb.info", "kurzepost.de",
  "l33r.com", "labetteraverouge.at", "lackmail.net", "landmail.co",
  "lawlita.com", "lazyinbox.com", "letthemeatspam.com", "lhsdv.com",
  "lifebyfood.com", "link2mail.net", "litedrop.com", "loadby.us",
  "login-email.ml", "lol.ovh", "lookugly.com", "lopl.co.cc",
  "lovebitco.in", "lr78.com", "lroid.com", "lukop.dk",
  "m21.cc", "m4ilweb.info", "mail-temporaire.fr", "mail.by",
  "mail.mezimages.net", "mail.zp.ua", "mail114.net", "mail1a.de",
  "mail21.cc", "mail2rss.org", "mail333.com", "mail4trash.com",
  "mailbidon.com", "mailbiz.biz", "mailblocks.com", "mailbucket.org",
  "mailcat.biz", "mailcatch.com", "mailde.de", "mailde.info",
  "maildrop.cc", "maildu.de", "maildx.com", "maileater.com",
  "mailexpire.com", "mailfa.tk", "mailforspam.com", "mailfree.ga",
  "mailfree.gq", "mailfree.ml", "mailfs.com", "mailguard.me",
  "mailhazard.com", "mailhazard.us", "mailhz.me", "mailimate.com",
  "mailin8r.com", "mailinater.com", "mailinator.com", "mailinator.net",
  "mailinator.org", "mailinator.us", "mailinator2.com", "mailincubator.com",
  "mailismagic.com", "mailjunk.gq", "mailmate.com", "mailme.ir",
  "mailme.lv", "mailmetrash.com", "mailmoat.com", "mailms.com",
  "mailnator.com", "mailnesia.com", "mailnull.com", "mailonaut.com",
  "mailorc.com", "mailorg.org", "mailpick.biz", "mailproxsy.com",
  "mailquack.com", "mailrock.biz", "mailscrap.com", "mailseal.de",
  "mailshell.com", "mailsiphon.com", "mailslapping.com", "mailslite.com",
  "mailtemp.info", "mailtome.de", "mailtothis.com", "mailtrash.net",
  "mailtv.net", "mailtv.tv", "mailzilla.com", "mailzilla.org",
  "makemetheking.com", "manifestgenerator.com", "manybrain.com",
  "materiali.ml", "mciek.com", "mega.zik.dj", "meinspamschutz.de",
  "meltmail.com", "messagebeamer.de", "mezimages.net", "mintemail.com",
  "misterpinball.de", "moncourrier.fr.nf", "monemail.fr.nf",
  "monmail.fr.nf", "monumentmail.com", "msa.minsmail.com", "mt2009.com",
  "mx0.wwwnew.eu", "my10minutemail.com", "mycard.net.ua", "mycleaninbox.net",
  "myemailboxy.com", "mymail-in.net", "mymailoasis.com", "mynetstore.de",
  "mypacks.net", "mypartyclip.de", "myphantomemail.com", "mysamp.de",
  "myspaceinc.com", "myspaceinc.net", "myspaceinc.org", "myspamless.com",
  "mytemp.email", "mytempemail.com", "n4p.eu", "nervmich.net",
  "nervtmich.net", "netmails.com", "netmails.net", "neverbox.com",
  "nice-4u.com", "nincsmail.com", "nincsmail.hu", "noblepioneer.com",
  "nobuma.com", "noclickemail.com", "nogmailspam.info", "nomail.pw",
  "nomail2me.com", "nomorespamemails.com", "nonspam.eu", "nospamfor.us",
  "nospamthanks.info", "notmailinator.com", "nowmymail.com", "nurfuerspam.de",
  "nus.edu.au", "nwldx.com", "objectmail.com", "obobbo.com",
  "odaymail.com", "oneoffemail.com", "oneoffmail.com", "onewaymail.com",
  "online.ms", "oopi.org", "opayq.com", "ordinaryamerican.net",
  "otherinbox.com", "ourklips.com", "outlawspam.com", "ovpn.to",
  "owlpic.com", "pancakemail.com", "paplease.com", "pepbot.com",
  "pfui.ru", "pimpedupveggie.com", "pjjkp.com", "plexolan.de",
  "poczta.onet.pl", "politikerclub.de", "poofy.org", "pookmail.com",
  "privacy.net", "proxymail.eu", "prtnx.com", "punkass.com",
  "rcpt.at", "re-gister.com", "reallymymail.com", "realtyalerts.ca",
  "recursor.net", "reliable-mail.com", "rhyta.com", "rmqkr.net",
  "royal.net", "rppkn.com", "rtrtr.com", "s0ny.net",
  "safe-mail.net", "safersignup.de", "safetymail.info", "sandelf.de",
  "saynotospams.com", "schafmail.de", "selfdestructingmail.com",
  "sendspamhere.com", "sharklasers.com", "shiftmail.com", "shitmail.org",
  "shortmail.net", "sibmail.com", "skeefmail.com", "slapsfromlastnight.com",
  "slaskpost.se", "slipry.net", "smellfear.com", "snakemail.com",
  "sneakemail.com", "sofimail.com", "sofort-mail.de", "sogetthis.com",
  "soodonims.com", "spam.la", "spam.su", "spam4.me",
  "spamavert.com", "spambob.com", "spambob.net", "spambob.org",
  "spambog.com", "spambog.de", "spambog.net", "spambog.ru",
  "spamcero.com", "spamcon.org", "spamcorptastic.com", "spamcowboy.com",
  "spamcowboy.net", "spamcowboy.org", "spamday.com", "spamex.com",
  "spamfighter.cf", "spamfighter.ga", "spamfighter.gq", "spamfighter.ml",
  "spamfighter.tk", "spamfree.eu", "spamfree24.com", "spamfree24.de",
  "spamfree24.eu", "spamfree24.info", "spamfree24.net", "spamfree24.org",
  "spamgoes.in", "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "spamherelots.com", "spamhereplease.com", "spamhole.com", "spamify.com",
  "spaminator.de", "spamkill.info", "spaml.com", "spaml.de",
  "spammotel.com", "spamobox.com", "spamoff.de", "spamsalad.in",
  "spamslicer.com", "spamspot.com", "spamstack.net", "spamthis.co.uk",
  "spamthisplease.com", "spamtrail.com", "spamtrap.ro", "spamtroll.net",
  "speed.1s.fr", "spikio.com", "supergreatmail.com", "supermailer.jp",
  "superrito.com", "superstachel.de", "suremail.info", "sute.jp",
  "tagyourself.com", "talkinator.com", "teewars.org", "teleworm.com",
  "teleworm.us", "temp-mail.org", "temp-mail.ru", "temp.emeraldwebmail.com",
  "temp.headstrong.de", "tempail.com", "tempalias.com", "tempe-mail.com",
  "tempemail.biz", "tempemail.co.za", "tempemail.com", "tempemail.net",
  "tempinbox.co.uk", "tempinbox.com", "tempmail.demo", "tempmail.eu",
  "tempmail.it", "tempmail.us", "tempmail2.com", "tempmailer.com",
  "tempmailer.de", "tempomail.fr", "temporarily.de", "temporarioemail.com.br",
  "temporaryemail.us", "temporaryforwarding.com", "temporaryinbox.com",
  "temporarymailaddress.com", "tempthe.net", "thanksnospam.info",
  "thankyou2010.com", "thisisnotmyrealemail.com", "thismail.net",
  "throwawayemailaddress.com", "tilien.com", "tittbit.in",
  "tizi.com", "tmailinator.com", "toiea.com", "toomail.biz",
  "topranklist.de", "tradermail.info", "trash-amil.com", "trash-mail.at",
  "trash-mail.com", "trash-mail.de", "trash2009.com", "trashemail.de",
  "trashmail.at", "trashmail.com", "trashmail.me", "trashmail.net",
  "trashmail.org", "trashmail.ws", "trashmailer.com", "trashymail.com",
  "trashymail.net", "trbvm.com", "trialmail.de", "tryalert.com",
  "turual.com", "twinmail.de", "tyldd.com", "uggsrock.com",
  "umail.net", "upliftnow.com", "uplipht.com", "uroid.com",
  "venompen.com", "veryrealemail.com", "viditag.com", "viewcastmedia.com",
  "viewcastmedia.net", "viewcastmedia.org", "viralplays.com",
  "vkcode.ru", "vomoto.com", "vpn.st", "vsimcard.com",
  "vubby.com", "walala.org", "walkmail.net", "webm4il.info",
  "wegwerf-email-addressen.de", "wegwerf-emails.de", "wegwerfadresse.de",
  "wegwerfemail.com", "wegwerfemail.de", "wegwerfmail.de", "wegwerfmail.info",
  "wegwerfmail.net", "wegwerfmail.org", "wetrainbayarea.com",
  "wetrainbayarea.org", "wh4f.org", "whatiaas.com", "whatpaas.com",
  "whatsaas.com", "whiffles.org", "whopy.com", "whtjddn.33mail.com",
  "whyspam.me", "wilemail.com", "willhackforfood.biz", "willselfdestruct.com",
  "winemaven.info", "wronghead.com", "wuzup.net", "wuzupmail.net",
  "www.e4ward.com", "wwwnew.eu", "xagloo.com", "xemaps.com",
  "xents.com", "xmaily.com", "xoxy.net", "yapped.net",
  "yopmail.fr", "yopmail.net", "yopmail.org", "ypmail.webarnak.fr.eu.org",
  "yuurok.com", "zehnminuten.de", "zehnminutenmail.de", "zippymail.info",
  "zoaxe.com", "zoemail.com", "zoemail.net", "zoemail.org",
]);

// Step 3: Suspicious patterns (test@test, a@a, user@user, etc.)
function isSuspiciousPattern(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return true;
  // Local part same as domain name = suspicious
  const domainName = domain.split(".")[0].toLowerCase();
  if (local.toLowerCase() === domainName) return true;
  // Very short local part (< 3 chars) = suspicious
  if (local.length < 3) return true;
  // Numbers-only local part = suspicious
  if (/^\d+$/.test(local)) return true;
  // "test" or "fake" in local part
  if (/^(test|spam|temp|tmp)/i.test(local)) return true;
  return false;
}

export function isValidEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || !email.includes("@")) {
    return { valid: false, reason: "邮箱必须包含 @" };
  }
  if (!BASIC_EMAIL.test(email)) {
    return { valid: false, reason: "邮箱格式不正确" };
  }
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: "不支持临时邮箱，请使用真实邮箱" };
  }
  if (isSuspiciousPattern(email)) {
    return { valid: false, reason: "这看起来不像真实邮箱，请输入有效地址" };
  }
  // TLD must be at least 2 chars
  const tld = domain.split(".").pop() || "";
  if (tld.length < 2) {
    return { valid: false, reason: "邮箱域名不完整" };
  }
  return { valid: true };
}

function encodePassword(pwd: string): string {
  let hash = 0;
  const salt = "dalanying_salt_2026";
  const input = pwd + salt;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dalanying_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    const t = setTimeout(() => { setHydrated(true); setLoading(false); }, 100);
    return () => clearTimeout(t);
  }, []);

  // Supabase auth listener
  useEffect(() => {
    if (!hasSupabase) return;
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u: AppUser = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email!.split("@")[0],
          email: session.user.email!,
          avatar: "",
        };
        setUser(u);
        localStorage.setItem("dalanying_user", JSON.stringify(u));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const requireLogin = useCallback(() => {
    if (!user) setShowLoginModal(true);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "请输入邮箱和密码", code: "empty" };
    }
    const check = isValidEmail(email);
    if (!check.valid) {
      return { success: false, error: check.reason || "邮箱格式不正确", code: "invalid_email" };
    }
    if (password.length < 6) {
      return { success: false, error: "密码至少 6 位", code: "short_password" };
    }

    if (hasSupabase) {
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login")) return { success: false, error: "邮箱或密码错误", code: "wrong_credentials" };
        if (error.message.includes("Email not confirmed")) return { success: false, error: "账号未激活，请先前往邮箱点击验证链接", code: "not_confirmed" };
        return { success: false, error: error.message, code: "unknown" };
      }
      const u: AppUser = { id: data.user.id, name: data.user.user_metadata?.full_name || email.split("@")[0], email, avatar: "" };
      setUser(u);
      localStorage.setItem("dalanying_user", JSON.stringify(u));
      return { success: true };
    }

    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    const existing = users.find((u: AppUser) => u.email === email);
    if (!existing) return { success: false, error: "该邮箱未注册，请先注册", code: "not_found" };
    if (existing.id !== encodePassword(password)) return { success: false, error: "密码错误", code: "wrong_password" };
    setUser(existing);
    localStorage.setItem("dalanying_user", JSON.stringify(existing));
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: "请填写所有字段", code: "empty" };
    }
    if (name.trim().length < 2) {
      return { success: false, error: "昵称至少 2 个字符", code: "short_name" };
    }
    const check = isValidEmail(email);
    if (!check.valid) {
      return { success: false, error: check.reason || "邮箱格式不正确", code: "invalid_email" };
    }
    if (password.length < 6) {
      return { success: false, error: "密码至少 6 位", code: "short_password" };
    }

    if (hasSupabase) {
      const { data, error } = await supabase!.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) {
        if (error.message.includes("already registered")) return { success: false, error: "该邮箱已注册", code: "exists" };
        return { success: false, error: error.message, code: "unknown" };
      }
      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          return { success: false, error: "该邮箱已注册", code: "exists" };
        }
        return { success: true, code: "check_email" };
      }
      return { success: true, code: "check_email" };
    }

    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    if (users.some((u: AppUser) => u.email === email)) {
      return { success: false, error: "该邮箱已注册", code: "exists" };
    }
    const newUser: AppUser = { id: encodePassword(password), name, email, avatar: "" };
    users.push(newUser);
    localStorage.setItem("dalanying_users", JSON.stringify(users));
    setUser(newUser);
    localStorage.setItem("dalanying_user", JSON.stringify(newUser));
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (hasSupabase) await supabase!.auth.signOut();
    setUser(null);
    localStorage.removeItem("dalanying_user");
  }, []);

  if (!hydrated) {
    return <div style={{ minHeight: "100vh", background: "#0c0c0e" }} />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, requireLogin, login, register, logout, showLoginModal, setShowLoginModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
