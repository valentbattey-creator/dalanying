// ===== 智能搜索系统 =====

// 同义词映射
export const SYNONYMS: Record<string, string[]> = {
  "电脑": ["笔记本", "游戏本", "主机", "台式机", "PC", "macbook", "thinkpad"],
  "手机": ["智能手机", "iPhone", "安卓", "华为", "小米", "oppo", "vivo", "三星"],
  "相机": ["摄影", "单反", "微单", "索尼", "佳能", "尼康", "富士", "拍照"],
  "汽车": ["车", "轿车", "SUV", "改装", "机车", "电动车", "特斯拉", "宝马", "奔驰"],
  "游戏": ["电竞", "steam", "switch", "PS5", "Xbox", "手游", "端游", "原神", "王者"],
  "运动": ["健身", "跑步", "篮球", "足球", "游泳", "骑行", "户外", "登山"],
  "音乐": ["耳机", "音响", "hifi", "播放器", "吉他", "钢琴", "听歌", "演唱会"],
  "穿搭": ["衣服", "潮牌", "球鞋", "手表", "配饰", "包", "复古", "工装"],
  "美食": ["做饭", "餐厅", "探店", "烧烤", "火锅", "咖啡", "奶茶", "烘焙"],
  "数码": ["科技", "电子产品", "评测", "开箱", "智能家居", "无人机"],
  "投资": ["股票", "基金", "理财", "比特币", "房产", "财经", "赚钱"],
  "旅行": ["旅游", "攻略", "酒店", "机票", "自驾", "露营", "打卡"],
  "宠物": ["猫", "狗", "猫咪", "狗狗", "养宠", "萌宠", "撸猫"],
  "设计": ["UI", "平面", "室内设计", "建筑", "插画", "3D", "建模"],
  "编程": ["代码", "程序员", "前端", "后端", "Python", "JavaScript", "AI", "人工智能"],
};

// 扩展搜索词：输入一个词，返回包含同义词的所有搜索词
export function expandSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [trimmed];
  
  const results = new Set<string>([trimmed]);
  
  // 检查是否匹配同义词
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    const allWords = [key, ...synonyms];
    const queryLower = trimmed.toLowerCase();
    const match = allWords.some(w => queryLower.includes(w.toLowerCase()) || w.toLowerCase().includes(queryLower));
    if (match) {
      allWords.forEach(w => results.add(w));
    }
  }
  
  return Array.from(results);
}

// 模糊匹配：检查文本是否包含任意搜索词
export function fuzzyMatch(text: string, searchTerms: string[]): boolean {
  const lower = text.toLowerCase();
  return searchTerms.some(term => lower.includes(term.toLowerCase()));
}
