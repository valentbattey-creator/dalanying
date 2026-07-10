// Content moderation for names - filters inappropriate content

// Banned patterns (violence, porn, hate, etc.)
const BANNED_PATTERNS = [
  // Chinese bad words
  /[杀弑屠虐奸淫嫖娼赌毒]+/,
  /[操草艹肏]+[你尼他她妈吗的]/,
  /[日入肉肏][你尼他她]/,
  /[鸡巴屌吊jb]+/,
  /[傻煞沙砂][逼b比笔]/,
  /[妈马码玛][的得]+/,
  /fuck/i, /shit/i, /dick/i, /cock/i, /pussy/i, /bitch/i,
  /nigger/i, /nazi/i, /hitler/i,
  /[黄h][色s][网w][站z]/i,
  /[约y][炮p]/i, /[一y][夜y][情q]/i,
  // Blood/violence
  /[死殺血屍]+/,
  /[枪槍][杀殺]/,
  // Extremely offensive
  /[粪屎尿屁]+/,
  /贱[人货种]/,
  /狗[日操]/,
  /去死/,
  /[变bian][态tai]/,
  /变态/,
  // Spam patterns
  /[薇v][信x][号h].{3,}/,
  /[加qQ]{2,}[:：]\d+/,
  /[微w][信x][:：].{3,}/,
  /[公g][众z][号h].{3,}/,
  /看[我w][主z][页y]/,
  /[私s][信x][我w]/,
];

// Names that impersonate admin/official
const IMPERSONATION_PATTERNS = [
  /^管理员/i, /^admin/i, /^官方/i, /^系统/i, /^客服/i,
  /^版主/i, /^站长/i, /^大岚荧$/i, /^dalanying$/i,
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export function moderateName(name: string): ModerationResult {
  if (!name || name.trim().length < 2) {
    return { allowed: false, reason: "名字至少需要2个字符" };
  }
  if (name.trim().length > 12) {
    return { allowed: false, reason: "名字最多12个字符" };
  }

  const trimmed = name.trim();

  // Check impersonation first
  for (const pattern of IMPERSONATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "不能使用官方名称" };
    }
  }

  // Check banned patterns
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "名字包含不当内容，请换一个" };
    }
  }

  // Check for pure numbers or special chars only
  if (/^[\d_\-\s.]+$/.test(trimmed)) {
    return { allowed: false, reason: "名字不能只包含数字和符号" };
  }

  // Check for repeated characters (spam detection)
  if (/(.)\1{4,}/.test(trimmed)) {
    return { allowed: false, reason: "名字不能包含过多重复字符" };
  }

  return { allowed: true };
}
