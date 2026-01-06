/**
 * AIService - AI 服务
 * 通过 OpenRouter API 提供智能功能
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import type { TrainingRecord, TrainingModuleType } from '@/lib/database.types';
import type { TrainingStats } from './storage';

// OpenRouter API 配置
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';

// 缓存配置
const CACHE_KEY_PREFIX = 'ai_cache_';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 分钟

// 模块中文名称映射
const MODULE_NAMES: Record<TrainingModuleType, string> = {
  schulte: '舒尔特表',
  stroop: 'Stroop训练',
  sequence: '序列工作记忆',
  auditory: '听觉选择性注意',
  bilateral: '双侧肢体协调',
  classification: '规则分类逻辑',
  scene: '情景联想记忆',
};

// 预定义反馈模板（用于 API 失败时的回退）
const FALLBACK_FEEDBACK_TEMPLATES: Record<string, string[]> = {
  excellent: [
    '表现出色！你的专注力和反应速度都很棒，继续保持！',
    '非常好的成绩！你的认知能力正在稳步提升。',
    '太棒了！这次训练展现了你优秀的认知控制能力。',
  ],
  good: [
    '做得不错！继续练习可以进一步提升。',
    '良好的表现！你正在正确的轨道上。',
    '很好的进步！保持这个训练节奏。',
  ],
  average: [
    '继续加油！每次练习都是进步的机会。',
    '不错的尝试！多加练习会看到明显提升。',
    '保持耐心，认知能力的提升需要持续训练。',
  ],
  needsImprovement: [
    '别灰心！认知训练需要时间，坚持就会有收获。',
    '这是一个学习的过程，继续努力！',
    '每个人都有自己的节奏，重要的是坚持训练。',
  ],
};

// 预定义推荐模板
const FALLBACK_RECOMMENDATION_TEMPLATES: Record<string, string[]> = {
  balanced: [
    '建议均衡训练各个模块，全面提升认知能力。',
    '你的训练比较均衡，继续保持多样化的训练方式。',
  ],
  focusWeak: [
    '建议多练习表现较弱的模块，针对性提升。',
    '可以适当增加薄弱项目的训练频率。',
  ],
  increaseFrequency: [
    '建议增加训练频率，每天坚持训练效果更好。',
    '保持每日训练的习惯，认知能力会稳步提升。',
  ],
  increaseDifficulty: [
    '你的表现很好，可以尝试提高难度挑战自己。',
    '建议逐步提升训练难度，突破舒适区。',
  ],
};

interface CacheEntry {
  response: string;
  timestamp: number;
}

interface AIServiceOptions {
  apiKey?: string;
  model?: string;
}

/**
 * 检查 OpenRouter API 是否已配置
 */
export function isAIConfigured(): boolean {
  return typeof process !== 'undefined' && 
         !!process.env.OPENROUTER_API_KEY && 
         process.env.OPENROUTER_API_KEY.length > 0;
}

/**
 * 获取缓存
 */
function getCache(key: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    
    return entry.response;
  } catch {
    return null;
  }
}

/**
 * 设置缓存
 */
function setCache(key: string, response: string): void {
  if (typeof window === 'undefined') return;
  
  const entry: CacheEntry = {
    response,
    timestamp: Date.now(),
  };
  
  localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
}

/**
 * 生成缓存键
 */
function generateCacheKey(type: string, data: unknown): string {
  const dataStr = JSON.stringify(data);
  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${type}_${hash}`;
}

/**
 * 调用 OpenRouter API
 */
async function callOpenRouterAPI(
  prompt: string,
  options: AIServiceOptions = {}
): Promise<string> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  const model = options.model || DEFAULT_MODEL;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }
  
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个认知训练助手，帮助用户分析训练表现并提供个性化建议。请用简洁友好的中文回复。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 获取随机模板
 */
function getRandomTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 根据准确率获取反馈类别
 */
function getFeedbackCategory(accuracy: number): keyof typeof FALLBACK_FEEDBACK_TEMPLATES {
  if (accuracy >= 90) return 'excellent';
  if (accuracy >= 70) return 'good';
  if (accuracy >= 50) return 'average';
  return 'needsImprovement';
}

/**
 * 生成训练反馈
 * 
 * Requirements: 9.1, 9.3, 9.4, 9.5
 */
export async function generateFeedback(
  record: TrainingRecord,
  options: AIServiceOptions = {}
): Promise<string> {
  // 生成缓存键
  const cacheKey = generateCacheKey('feedback', {
    moduleType: record.module_type,
    score: record.score,
    accuracy: record.accuracy,
    difficulty: record.difficulty,
  });
  
  // 检查缓存
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 尝试调用 API
  try {
    if (!isAIConfigured()) {
      throw new Error('AI not configured');
    }
    
    const moduleName = MODULE_NAMES[record.module_type];
    const prompt = `用户刚完成了一次${moduleName}训练：
- 得分：${record.score}
- 准确率：${(record.accuracy * 100).toFixed(1)}%
- 难度等级：${record.difficulty}
- 用时：${record.duration}秒

请给出简短的训练反馈（50字以内），鼓励用户继续训练。`;
    
    const response = await callOpenRouterAPI(prompt, options);
    
    // 缓存响应
    setCache(cacheKey, response);
    
    return response;
  } catch (error) {
    // 回退到预定义模板
    console.warn('AI feedback failed, using fallback template:', error);
    const category = getFeedbackCategory(record.accuracy * 100);
    const fallbackResponse = getRandomTemplate(FALLBACK_FEEDBACK_TEMPLATES[category]);
    
    // 缓存回退响应，确保相同输入返回相同结果
    setCache(cacheKey, fallbackResponse);
    
    return fallbackResponse;
  }
}

/**
 * 生成训练建议
 * 
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export async function generateRecommendation(
  stats: TrainingStats,
  options: AIServiceOptions = {}
): Promise<string> {
  // 生成缓存键
  const cacheKey = generateCacheKey('recommendation', {
    totalSessions: stats.totalSessions,
    streakDays: stats.streakDays,
    moduleStats: Object.entries(stats.moduleStats).map(([k, v]) => ({
      module: k,
      sessions: v.sessions,
      avgAccuracy: v.avgAccuracy,
      trend: v.trend,
    })),
  });
  
  // 检查缓存
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 尝试调用 API
  try {
    if (!isAIConfigured()) {
      throw new Error('AI not configured');
    }
    
    const moduleStatsStr = Object.entries(stats.moduleStats)
      .filter(([, v]) => v.sessions > 0)
      .map(([k, v]) => `- ${MODULE_NAMES[k as TrainingModuleType]}：${v.sessions}次训练，平均准确率${(v.avgAccuracy * 100).toFixed(1)}%，趋势${v.trend === 'improving' ? '上升' : v.trend === 'declining' ? '下降' : '稳定'}`)
      .join('\n');
    
    const prompt = `用户的认知训练统计：
- 总训练次数：${stats.totalSessions}
- 连续训练天数：${stats.streakDays}
- 各模块表现：
${moduleStatsStr || '暂无训练记录'}

请给出简短的训练建议（80字以内），帮助用户制定下一步训练计划。`;
    
    const response = await callOpenRouterAPI(prompt, options);
    
    // 缓存响应
    setCache(cacheKey, response);
    
    return response;
  } catch (error) {
    // 回退到预定义模板
    console.warn('AI recommendation failed, using fallback template:', error);
    const fallbackResponse = getFallbackRecommendation(stats);
    
    // 缓存回退响应，确保相同输入返回相同结果
    setCache(cacheKey, fallbackResponse);
    
    return fallbackResponse;
  }
}

/**
 * 获取回退推荐
 */
function getFallbackRecommendation(stats: TrainingStats): string {
  // 分析训练情况
  const activeModules = Object.entries(stats.moduleStats)
    .filter(([, v]) => v.sessions > 0);
  
  if (activeModules.length === 0) {
    return '欢迎开始认知训练！建议从舒尔特表开始，逐步尝试各个训练模块。';
  }
  
  // 检查是否有明显薄弱项
  const weakModules = activeModules.filter(([, v]) => v.avgAccuracy < 0.6);
  if (weakModules.length > 0) {
    return getRandomTemplate(FALLBACK_RECOMMENDATION_TEMPLATES.focusWeak);
  }
  
  // 检查训练频率
  if (stats.streakDays < 3) {
    return getRandomTemplate(FALLBACK_RECOMMENDATION_TEMPLATES.increaseFrequency);
  }
  
  // 检查是否表现优秀
  const excellentModules = activeModules.filter(([, v]) => v.avgAccuracy > 0.85);
  if (excellentModules.length > activeModules.length / 2) {
    return getRandomTemplate(FALLBACK_RECOMMENDATION_TEMPLATES.increaseDifficulty);
  }
  
  return getRandomTemplate(FALLBACK_RECOMMENDATION_TEMPLATES.balanced);
}

/**
 * 建议难度调整
 * 
 * Requirements: 9.6
 */
export async function suggestDifficulty(
  recentRecords: TrainingRecord[],
  currentDifficulty: number
): Promise<number> {
  if (recentRecords.length === 0) {
    return currentDifficulty;
  }
  
  // 计算最近记录的平均准确率
  const avgAccuracy = recentRecords.reduce((sum, r) => sum + r.accuracy, 0) / recentRecords.length;
  
  // 根据准确率调整难度
  if (avgAccuracy > 0.85 && currentDifficulty < 10) {
    // 表现优秀，提高难度
    return Math.min(currentDifficulty + 1, 10);
  } else if (avgAccuracy < 0.5 && currentDifficulty > 1) {
    // 表现较差，降低难度
    return Math.max(currentDifficulty - 1, 1);
  }
  
  // 保持当前难度
  return currentDifficulty;
}

/**
 * 清除 AI 缓存（用于测试）
 */
export function clearAICache(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// 导出用于测试的辅助函数和常量
export const _testHelpers = {
  CACHE_KEY_PREFIX,
  CACHE_EXPIRY_MS,
  FALLBACK_FEEDBACK_TEMPLATES,
  FALLBACK_RECOMMENDATION_TEMPLATES,
  MODULE_NAMES,
  getCache,
  setCache,
  generateCacheKey,
  getFeedbackCategory,
  getRandomTemplate,
  getFallbackRecommendation,
};
