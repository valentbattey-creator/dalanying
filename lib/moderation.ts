// ===== 内容审核系统 - dalanying =====

// 敏感词库（政治敏感、色情、暴力、血腥等）
const BLOCKED_KEYWORDS: { word: string; category: string }[] = [
  // 色情类
  { word: "裸体", category: "色情" }, { word: "色情", category: "色情" }, { word: "淫秽", category: "色情" },
  { word: "成人影片", category: "色情" }, { word: "av", category: "色情" }, { word: "做爱", category: "色情" },
  { word: "性交", category: "色情" }, { word: "约炮", category: "色情" }, { word: "嫖娼", category: "色情" },
  { word: "妓女", category: "色情" }, { word: "卖淫", category: "色情" }, { word: "一夜情", category: "色情" },
  { word: "性爱", category: "色情" }, { word: "床上", category: "色情" }, { word: "露点", category: "色情" },
  { word: "大尺度", category: "色情" }, { word: "三级片", category: "色情" }, { word: "黄片", category: "色情" },
  { word: "自慰", category: "色情" }, { word: "口交", category: "色情" }, { word: "肛交", category: "色情" },
  
  // 暴力血腥类
  { word: "杀人", category: "暴力" }, { word: "砍死", category: "暴力" }, { word: "血淋淋", category: "暴力" },
  { word: "碎尸", category: "暴力" }, { word: "肢解", category: "暴力" }, { word: "斩首", category: "暴力" },
  { word: "虐杀", category: "暴力" }, { word: "屠杀", category: "暴力" }, { word: "暴打", category: "暴力" },
  { word: "殴打致死", category: "暴力" }, { word: "恐怖袭击", category: "暴力" },
  
  // 赌博毒品类
  { word: "赌博", category: "违法" }, { word: "赌场", category: "违法" }, { word: "赌球", category: "违法" },
  { word: "毒品", category: "违法" }, { word: "吸毒", category: "违法" }, { word: "大麻", category: "违法" },
  { word: "海洛因", category: "违法" }, { word: "冰毒", category: "违法" }, { word: "摇头丸", category: "违法" },
  
  // 政治敏感类
  { word: "台独", category: "政治" }, { word: "港独", category: "政治" }, { word: "藏独", category: "政治" },
  { word: "疆独", category: "政治" }, { word: "法轮功", category: "政治" }, { word: "六四", category: "政治" },
  { word: "天安门", category: "政治" }, { word: "反党", category: "政治" }, { word: "反华", category: "政治" },
  { word: "中共灭亡", category: "政治" }, { word: "共产党下台", category: "政治" },
  { word: "习近平下台", category: "政治" }, { word: "推翻政府", category: "政治" },
  { word: "民主运动", category: "政治" }, { word: "颜色革命", category: "政治" },
];

// 昵称审核关键词
const NAME_BLOCKED: string[] = [
  "习近平", "胡锦涛", "温家宝", "李克强", "毛泽东", "邓小平", "江泽民",
  "admin", "管理员", "站长", "owner", "dalanying官方", "官方", "系统",
  "fuck", "shit", "操", "他妈", "傻逼", "sb", "脑残", "去死",
  "妓女", "婊子", "鸡巴", "龟头", "fag", "nigger", "纳粹", "希特勒",
];

export interface ModerationResult {
  passed: boolean;
  reason?: string;
  category?: string;
  matchedWord?: string;
}

/**
 * 审核文本内容（帖子标题、正文、评论）
 */
export function moderateContent(text: string): ModerationResult {
  if (!text || !text.trim()) return { passed: true };
  const lower = text.toLowerCase();
  
  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw.word.toLowerCase())) {
      return {
        passed: false,
        reason: `内容包含违规词汇（${kw.category}类）`,
        category: kw.category,
        matchedWord: kw.word,
      };
    }
  }
  return { passed: true };
}

/**
 * 审核昵称
 */
export function moderateName(name: string): ModerationResult {
  if (!name || name.length < 2) {
    return { passed: false, reason: "昵称至少需要2个字符" };
  }
  if (name.length > 12) {
    return { passed: false, reason: "昵称最多12个字符" };
  }
  const lower = name.toLowerCase();
  
  // 检查是否包含屏蔽词
  for (const blocked of NAME_BLOCKED) {
    if (lower.includes(blocked.toLowerCase()) || lower === blocked.toLowerCase()) {
      return { passed: false, reason: "该昵称不可使用" };
    }
  }
  
  // 检查是否只有数字和字母的基础组合（避免纯随机）
  // 允许中文、字母、数字、下划线
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(name)) {
    return { passed: false, reason: "昵称只能包含中文、字母、数字和下划线" };
  }
  
  return { passed: true };
}

/**
 * 获取违规等级：1=警告, 2=删帖, 3=封号
 */
export function getViolationLevel(category: string): number {
  switch (category) {
    case "政治": return 3;  // 直接封号
    case "色情": return 3;
    case "暴力": return 3;
    case "违法": return 3;
    default: return 2;       // 删帖
  }
}

// ===== Backwards compatibility =====
// Old interface used { allowed: boolean; reason?: string }
// This wrapper provides compatibility
export function moderateNameCompat(name: string): { allowed: boolean; reason?: string } {
  const result = moderateName(name);
  return { allowed: result.passed, reason: result.reason };
}
