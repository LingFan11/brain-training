/**
 * StroopEngine - Stroop训练引擎
 * 实现Stroop训练的核心逻辑：试次生成、响应处理、成绩计算
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// 中文颜色词定义
export const CHINESE_COLORS = ['红', '蓝', '绿', '黄'] as const;
export type ChineseColor = typeof CHINESE_COLORS[number];

// 颜色词到CSS颜色的映射
export const COLOR_MAP: Record<ChineseColor, string> = {
  '红': '#ef4444',
  '蓝': '#3b82f6',
  '绿': '#22c55e',
  '黄': '#eab308',
};

// 颜色词到英文名称的映射（用于CSS类名等）
export const COLOR_NAME_MAP: Record<ChineseColor, string> = {
  '红': 'red',
  '蓝': 'blue',
  '绿': 'green',
  '黄': 'yellow',
};

export interface StroopConfig {
  congruentRatio: number;   // 一致试次比例 (0-1)
  trialCount: number;       // 试次数量
  difficulty?: number;      // 1-10
}

export interface StroopTrial {
  word: ChineseColor;       // 颜色词
  inkColor: ChineseColor;   // 墨水颜色
  isCongruent: boolean;     // 是否一致
}

export interface StroopResponse {
  correct: boolean;
  rt: number;               // 反应时间（毫秒）
  selectedColor: ChineseColor;
}

export interface StroopState {
  trials: StroopTrial[];
  currentIndex: number;
  responses: StroopResponse[];
  startTime: number | null;
  trialStartTime: number | null;
  isComplete: boolean;
}

export interface StroopResult {
  score: number;
  accuracy: number;
  duration: number;
  avgResponseTime: number;
  congruentAccuracy: number;
  incongruentAccuracy: number;
  totalTrials: number;
  correctCount: number;
  errorCount: number;
}


/**
 * 生成单个Stroop试次
 */
export function generateTrial(isCongruent: boolean): StroopTrial {
  const wordIndex = Math.floor(Math.random() * CHINESE_COLORS.length);
  const word = CHINESE_COLORS[wordIndex];
  
  let inkColor: ChineseColor;
  if (isCongruent) {
    inkColor = word;
  } else {
    // 选择一个不同的颜色
    const otherColors = CHINESE_COLORS.filter(c => c !== word);
    const inkIndex = Math.floor(Math.random() * otherColors.length);
    inkColor = otherColors[inkIndex];
  }
  
  return {
    word,
    inkColor,
    isCongruent,
  };
}

/**
 * 生成Stroop试次序列
 * 根据配置的一致比例生成指定数量的试次
 */
export function generateTrials(config: StroopConfig): StroopTrial[] {
  const { congruentRatio, trialCount } = config;
  
  // 计算一致和不一致试次的数量
  const congruentCount = Math.round(trialCount * congruentRatio);
  const incongruentCount = trialCount - congruentCount;
  
  // 生成试次
  const trials: StroopTrial[] = [];
  
  for (let i = 0; i < congruentCount; i++) {
    trials.push(generateTrial(true));
  }
  
  for (let i = 0; i < incongruentCount; i++) {
    trials.push(generateTrial(false));
  }
  
  // 随机打乱顺序
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trials[i], trials[j]] = [trials[j], trials[i]];
  }
  
  return trials;
}

/**
 * 创建初始状态
 */
export function createInitialState(config: StroopConfig): StroopState {
  return {
    trials: generateTrials(config),
    currentIndex: 0,
    responses: [],
    startTime: null,
    trialStartTime: null,
    isComplete: false,
  };
}

/**
 * StroopEngine 类 - 处理Stroop训练的状态和逻辑
 */
export class StroopEngine {
  private state: StroopState;
  private config: StroopConfig;

  constructor(config: StroopConfig) {
    this.config = config;
    this.state = createInitialState(config);
  }

  /**
   * 获取当前状态
   */
  getState(): StroopState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): StroopConfig {
    return { ...this.config };
  }

  /**
   * 开始训练
   */
  start(): void {
    if (this.state.startTime === null) {
      this.state.startTime = Date.now();
      this.state.trialStartTime = Date.now();
    }
  }

  /**
   * 获取当前试次
   */
  getCurrentTrial(): StroopTrial | null {
    if (this.state.isComplete || this.state.currentIndex >= this.state.trials.length) {
      return null;
    }
    return this.state.trials[this.state.currentIndex];
  }

  /**
   * 处理用户响应
   * 返回响应是否正确
   */
  respond(selectedColor: ChineseColor): boolean {
    // 如果训练已完成，忽略响应
    if (this.state.isComplete) {
      return false;
    }

    // 如果还没开始，自动开始
    if (this.state.startTime === null) {
      this.start();
    }

    const currentTrial = this.getCurrentTrial();
    if (!currentTrial) {
      return false;
    }

    const now = Date.now();
    const rt = this.state.trialStartTime ? now - this.state.trialStartTime : 0;
    const correct = selectedColor === currentTrial.inkColor;

    // 记录响应
    this.state.responses.push({
      correct,
      rt,
      selectedColor,
    });

    // 移动到下一个试次
    this.state.currentIndex++;
    this.state.trialStartTime = now;

    // 检查是否完成
    if (this.state.currentIndex >= this.state.trials.length) {
      this.state.isComplete = true;
    }

    return correct;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createInitialState(this.config);
  }

  /**
   * 更新配置并重置
   */
  setConfig(config: Partial<StroopConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }

  /**
   * 计算训练结果
   */
  calculateResult(): StroopResult {
    const totalTrials = this.state.responses.length;
    const correctResponses = this.state.responses.filter(r => r.correct);
    const correctCount = correctResponses.length;
    const errorCount = totalTrials - correctCount;

    // 计算总时长
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;

    // 计算准确率
    const accuracy = totalTrials > 0 ? correctCount / totalTrials : 0;

    // 计算平均反应时间
    const avgResponseTime = totalTrials > 0
      ? this.state.responses.reduce((sum, r) => sum + r.rt, 0) / totalTrials
      : 0;

    // 分别计算一致和不一致试次的准确率
    const congruentTrials = this.state.trials
      .slice(0, totalTrials)
      .map((trial, i) => ({ trial, response: this.state.responses[i] }))
      .filter(({ trial }) => trial.isCongruent);
    
    const incongruentTrials = this.state.trials
      .slice(0, totalTrials)
      .map((trial, i) => ({ trial, response: this.state.responses[i] }))
      .filter(({ trial }) => !trial.isCongruent);

    const congruentCorrect = congruentTrials.filter(({ response }) => response.correct).length;
    const incongruentCorrect = incongruentTrials.filter(({ response }) => response.correct).length;

    const congruentAccuracy = congruentTrials.length > 0
      ? congruentCorrect / congruentTrials.length
      : 0;
    
    const incongruentAccuracy = incongruentTrials.length > 0
      ? incongruentCorrect / incongruentTrials.length
      : 0;

    // 计算分数
    // 基础分 = 正确数 * 10
    // 速度奖励 = 基于平均反应时间
    // 不一致试次奖励 = 不一致正确数 * 5（因为更难）
    const baseScore = correctCount * 10;
    const speedBonus = Math.max(0, Math.round((1000 - avgResponseTime) / 10));
    const incongruentBonus = incongruentCorrect * 5;
    const score = Math.max(0, baseScore + speedBonus + incongruentBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      congruentAccuracy: Math.round(congruentAccuracy * 100) / 100,
      incongruentAccuracy: Math.round(incongruentAccuracy * 100) / 100,
      totalTrials,
      correctCount,
      errorCount,
    };
  }

  /**
   * 检查训练是否完成
   */
  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * 获取当前进度
   */
  getProgress(): { current: number; total: number } {
    return {
      current: this.state.currentIndex,
      total: this.state.trials.length,
    };
  }

  /**
   * 获取所有试次
   */
  getTrials(): StroopTrial[] {
    return [...this.state.trials];
  }
}

/**
 * 根据难度获取配置
 */
export function getConfigFromDifficulty(difficulty: number): StroopConfig {
  // 难度1-10
  // 难度越高，不一致比例越高，试次越多
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  // 一致比例从0.8（简单）到0.2（困难）
  const congruentRatio = 0.8 - (normalizedDifficulty - 1) * 0.067;
  
  // 试次数量从10（简单）到30（困难）
  const trialCount = 10 + Math.floor((normalizedDifficulty - 1) * 2.2);
  
  return {
    congruentRatio: Math.round(congruentRatio * 100) / 100,
    trialCount,
    difficulty: normalizedDifficulty,
  };
}

/**
 * 验证试次是否有效
 */
export function validateTrial(trial: StroopTrial): boolean {
  // 检查颜色词是否有效
  if (!CHINESE_COLORS.includes(trial.word)) {
    return false;
  }
  
  // 检查墨水颜色是否有效
  if (!CHINESE_COLORS.includes(trial.inkColor)) {
    return false;
  }
  
  // 检查一致性标记是否正确
  const shouldBeCongruent = trial.word === trial.inkColor;
  if (trial.isCongruent !== shouldBeCongruent) {
    return false;
  }
  
  return true;
}

/**
 * 验证试次序列是否有效
 */
export function validateTrials(trials: StroopTrial[], config: StroopConfig): boolean {
  // 检查数量
  if (trials.length !== config.trialCount) {
    return false;
  }
  
  // 检查每个试次
  for (const trial of trials) {
    if (!validateTrial(trial)) {
      return false;
    }
  }
  
  // 检查一致比例（允许四舍五入误差）
  const congruentCount = trials.filter(t => t.isCongruent).length;
  const expectedCongruent = Math.round(config.trialCount * config.congruentRatio);
  if (Math.abs(congruentCount - expectedCongruent) > 1) {
    return false;
  }
  
  return true;
}
