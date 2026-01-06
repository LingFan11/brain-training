/**
 * BilateralEngine - 双侧肢体镜像协调训练引擎
 * 实现双侧协调训练的核心逻辑：图案生成、镜像坐标计算、触摸响应检测
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

export interface BilateralConfig {
  patternComplexity: number;  // 图案复杂度 (1-5)
  timeLimit: number;          // 每个图案时间限制(ms)
  patternCount: number;       // 图案数量
  mirrorRatio?: number;       // 镜像图案比例 (0-1)，默认0.5
  difficulty?: number;        // 1-10
}

export interface BilateralTarget {
  x: number;  // 0-1 范围内的相对坐标
  y: number;  // 0-1 范围内的相对坐标
}

export interface BilateralPattern {
  leftTarget: BilateralTarget;
  rightTarget: BilateralTarget;
  isMirror: boolean;
  index: number;
}

export interface BilateralResponse {
  patternIndex: number;
  correct: boolean;
  timing: number;           // 响应时间(ms)
  leftTouched: boolean;
  rightTouched: boolean;
  withinTimeLimit: boolean;
}

export interface BilateralState {
  patterns: BilateralPattern[];
  currentIndex: number;
  responses: BilateralResponse[];
  startTime: number | null;
  patternStartTime: number | null;
  isComplete: boolean;
  phase: 'ready' | 'running' | 'complete';
}

export interface BilateralResult {
  score: number;
  accuracy: number;
  duration: number;
  patternCount: number;
  correctCount: number;
  errorCount: number;
  avgTiming: number;
  mirrorAccuracy: number;
  nonMirrorAccuracy: number;
  timingPrecision: number;  // 平均时间偏差
}

/**
 * 生成随机目标坐标
 * 坐标范围在 0.1-0.9 之间，避免边缘
 */
function generateRandomTarget(): BilateralTarget {
  return {
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.8,
  };
}

/**
 * 计算镜像坐标
 * 对于镜像图案，leftX = 1 - rightX，y坐标相同
 */
export function calculateMirrorCoordinate(target: BilateralTarget): BilateralTarget {
  return {
    x: 1 - target.x,
    y: target.y,
  };
}

/**
 * 验证镜像坐标是否正确
 * 检查 leftX ≈ 1 - rightX (允许浮点误差)
 */
export function validateMirrorPattern(pattern: BilateralPattern): boolean {
  if (!pattern.isMirror) {
    return true; // 非镜像图案不需要验证镜像关系
  }
  
  const expectedLeftX = 1 - pattern.rightTarget.x;
  const tolerance = 0.0001;
  
  return (
    Math.abs(pattern.leftTarget.x - expectedLeftX) < tolerance &&
    Math.abs(pattern.leftTarget.y - pattern.rightTarget.y) < tolerance
  );
}

/**
 * 生成单个双侧协调图案
 */
export function generatePattern(isMirror: boolean, index: number): BilateralPattern {
  const rightTarget = generateRandomTarget();
  
  let leftTarget: BilateralTarget;
  if (isMirror) {
    // 镜像图案：左侧坐标是右侧的镜像
    leftTarget = calculateMirrorCoordinate(rightTarget);
  } else {
    // 非镜像图案：左侧坐标独立生成
    leftTarget = generateRandomTarget();
  }
  
  return {
    leftTarget,
    rightTarget,
    isMirror,
    index,
  };
}

/**
 * 生成双侧协调图案序列
 */
export function generatePatterns(config: BilateralConfig): BilateralPattern[] {
  const { patternCount, mirrorRatio = 0.5 } = config;
  
  // 计算镜像和非镜像图案数量
  const mirrorCount = Math.round(patternCount * mirrorRatio);
  const nonMirrorCount = patternCount - mirrorCount;
  
  // 生成图案
  const patterns: BilateralPattern[] = [];
  
  for (let i = 0; i < mirrorCount; i++) {
    patterns.push(generatePattern(true, patterns.length));
  }
  
  for (let i = 0; i < nonMirrorCount; i++) {
    patterns.push(generatePattern(false, patterns.length));
  }
  
  // 随机打乱顺序并重新分配索引
  for (let i = patterns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [patterns[i], patterns[j]] = [patterns[j], patterns[i]];
  }
  
  // 重新分配索引
  patterns.forEach((pattern, index) => {
    pattern.index = index;
  });
  
  return patterns;
}

/**
 * 创建初始状态
 */
export function createBilateralInitialState(config: BilateralConfig): BilateralState {
  return {
    patterns: generatePatterns(config),
    currentIndex: 0,
    responses: [],
    startTime: null,
    patternStartTime: null,
    isComplete: false,
    phase: 'ready',
  };
}

/**
 * 检测触摸响应是否正确
 * 需要同时触摸左右两个目标，且在时间限制内
 */
export function checkResponse(
  leftTouched: boolean,
  rightTouched: boolean,
  timing: number,
  timeLimit: number
): { correct: boolean; withinTimeLimit: boolean } {
  const withinTimeLimit = timing <= timeLimit;
  const correct = leftTouched && rightTouched && withinTimeLimit;
  
  return { correct, withinTimeLimit };
}

/**
 * 记录响应
 */
export function recordResponse(
  patternIndex: number,
  leftTouched: boolean,
  rightTouched: boolean,
  timing: number,
  timeLimit: number
): BilateralResponse {
  const { correct, withinTimeLimit } = checkResponse(
    leftTouched,
    rightTouched,
    timing,
    timeLimit
  );
  
  return {
    patternIndex,
    correct,
    timing,
    leftTouched,
    rightTouched,
    withinTimeLimit,
  };
}

/**
 * BilateralEngine 类 - 处理双侧协调训练的状态和逻辑
 */
export class BilateralEngine {
  private state: BilateralState;
  private config: BilateralConfig;

  constructor(config: BilateralConfig) {
    this.config = {
      ...config,
      mirrorRatio: config.mirrorRatio ?? 0.5,
    };
    this.state = createBilateralInitialState(this.config);
  }

  /**
   * 获取当前状态
   */
  getState(): BilateralState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): BilateralConfig {
    return { ...this.config };
  }

  /**
   * 开始训练
   */
  start(): void {
    if (this.state.phase === 'ready') {
      this.state.startTime = Date.now();
      this.state.patternStartTime = Date.now();
      this.state.phase = 'running';
    }
  }

  /**
   * 获取当前图案
   */
  getCurrentPattern(): BilateralPattern | null {
    if (this.state.isComplete || this.state.currentIndex >= this.state.patterns.length) {
      return null;
    }
    return this.state.patterns[this.state.currentIndex];
  }

  /**
   * 处理用户触摸响应
   */
  respond(leftTouched: boolean, rightTouched: boolean): BilateralResponse | null {
    if (this.state.isComplete || this.state.phase !== 'running') {
      return null;
    }

    const currentPattern = this.getCurrentPattern();
    if (!currentPattern) {
      return null;
    }

    const now = Date.now();
    const timing = this.state.patternStartTime ? now - this.state.patternStartTime : 0;

    const response = recordResponse(
      this.state.currentIndex,
      leftTouched,
      rightTouched,
      timing,
      this.config.timeLimit
    );

    this.state.responses.push(response);
    return response;
  }

  /**
   * 前进到下一个图案
   */
  advance(): boolean {
    if (this.state.isComplete) {
      return false;
    }

    // 如果当前图案没有响应，记录为超时/未响应
    if (this.state.responses.length <= this.state.currentIndex) {
      const timing = this.state.patternStartTime 
        ? Date.now() - this.state.patternStartTime 
        : this.config.timeLimit + 1;
      
      this.state.responses.push(
        recordResponse(
          this.state.currentIndex,
          false,
          false,
          timing,
          this.config.timeLimit
        )
      );
    }

    this.state.currentIndex++;
    this.state.patternStartTime = Date.now();

    // 检查是否完成
    if (this.state.currentIndex >= this.state.patterns.length) {
      this.state.isComplete = true;
      this.state.phase = 'complete';
    }

    return !this.state.isComplete;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createBilateralInitialState(this.config);
  }

  /**
   * 更新配置并重置
   */
  setConfig(config: Partial<BilateralConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }

  /**
   * 计算训练结果
   */
  calculateResult(): BilateralResult {
    const responses = this.state.responses;
    const patterns = this.state.patterns;
    
    // 统计正确和错误数
    const correctCount = responses.filter(r => r.correct).length;
    const errorCount = responses.length - correctCount;
    
    // 计算准确率
    const accuracy = responses.length > 0 ? correctCount / responses.length : 0;
    
    // 计算镜像和非镜像图案的准确率
    const mirrorResponses = responses.filter((r, i) => 
      i < patterns.length && patterns[i].isMirror
    );
    const nonMirrorResponses = responses.filter((r, i) => 
      i < patterns.length && !patterns[i].isMirror
    );
    
    const mirrorCorrect = mirrorResponses.filter(r => r.correct).length;
    const nonMirrorCorrect = nonMirrorResponses.filter(r => r.correct).length;
    
    const mirrorAccuracy = mirrorResponses.length > 0 
      ? mirrorCorrect / mirrorResponses.length 
      : 0;
    const nonMirrorAccuracy = nonMirrorResponses.length > 0 
      ? nonMirrorCorrect / nonMirrorResponses.length 
      : 0;
    
    // 计算平均响应时间
    const avgTiming = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.timing, 0) / responses.length
      : 0;
    
    // 计算时间精度（与时间限制的平均偏差）
    const timingPrecision = responses.length > 0
      ? responses.reduce((sum, r) => sum + Math.abs(r.timing - this.config.timeLimit / 2), 0) / responses.length
      : 0;
    
    // 计算总时长
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    // 计算分数
    // 基础分 = 正确数 * 10 * 复杂度
    // 速度奖励 = 基于平均响应时间
    // 镜像奖励 = 镜像正确数 * 5（因为更难）
    const baseScore = correctCount * 10 * this.config.patternComplexity;
    const speedBonus = Math.max(0, Math.round((this.config.timeLimit - avgTiming) / 10));
    const mirrorBonus = mirrorCorrect * 5;
    const score = Math.max(0, baseScore + speedBonus + mirrorBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      patternCount: this.config.patternCount,
      correctCount,
      errorCount,
      avgTiming: Math.round(avgTiming),
      mirrorAccuracy: Math.round(mirrorAccuracy * 100) / 100,
      nonMirrorAccuracy: Math.round(nonMirrorAccuracy * 100) / 100,
      timingPrecision: Math.round(timingPrecision),
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
      total: this.state.patterns.length,
    };
  }

  /**
   * 获取所有图案
   */
  getPatterns(): BilateralPattern[] {
    return [...this.state.patterns];
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getRemainingTime(): number {
    if (this.state.patternStartTime === null) {
      return this.config.timeLimit;
    }
    const elapsed = Date.now() - this.state.patternStartTime;
    return Math.max(0, this.config.timeLimit - elapsed);
  }

  /**
   * 检查当前图案是否超时
   */
  isTimedOut(): boolean {
    return this.getRemainingTime() <= 0;
  }
}

/**
 * 根据难度获取配置
 * 难度越高，图案越多，时间限制越短
 */
export function getBilateralConfigFromDifficulty(difficulty: number): BilateralConfig {
  // 难度1-10
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  // 图案复杂度从1（简单）到5（困难）
  const patternComplexity = Math.min(5, Math.ceil(normalizedDifficulty / 2));
  
  // 时间限制从3000ms（简单）到1000ms（困难）
  const timeLimit = 3000 - (normalizedDifficulty - 1) * 222;
  
  // 图案数量从5（简单）到15（困难）
  const patternCount = 5 + Math.floor((normalizedDifficulty - 1) * 1.1);
  
  // 镜像比例保持在0.5
  const mirrorRatio = 0.5;
  
  return {
    patternComplexity,
    timeLimit: Math.round(timeLimit),
    patternCount,
    mirrorRatio,
    difficulty: normalizedDifficulty,
  };
}

/**
 * 自适应难度调节
 * 根据最近的表现调整难度
 */
export function adjustBilateralDifficulty(
  currentConfig: BilateralConfig,
  accuracy: number
): BilateralConfig {
  const newConfig = { ...currentConfig };
  
  if (accuracy > 0.8) {
    // 高准确率：提升难度
    // 优先减少时间限制，其次增加图案数量
    if (newConfig.timeLimit > 1000) {
      newConfig.timeLimit -= 200;
    } else if (newConfig.patternCount < 20) {
      newConfig.patternCount += 2;
    }
    newConfig.difficulty = Math.min(10, (newConfig.difficulty || 5) + 1);
  } else if (accuracy < 0.5) {
    // 低准确率：降低难度
    // 优先增加时间限制，其次减少图案数量
    if (newConfig.timeLimit < 3000) {
      newConfig.timeLimit += 200;
    } else if (newConfig.patternCount > 5) {
      newConfig.patternCount -= 2;
    }
    newConfig.difficulty = Math.max(1, (newConfig.difficulty || 5) - 1);
  }
  // 准确率在50%-80%之间：保持当前难度
  
  return newConfig;
}

/**
 * 验证图案是否有效
 */
export function validatePattern(pattern: BilateralPattern): boolean {
  // 检查坐标范围
  const isValidCoord = (coord: number) => coord >= 0 && coord <= 1;
  
  if (!isValidCoord(pattern.leftTarget.x) || !isValidCoord(pattern.leftTarget.y)) {
    return false;
  }
  
  if (!isValidCoord(pattern.rightTarget.x) || !isValidCoord(pattern.rightTarget.y)) {
    return false;
  }
  
  // 如果是镜像图案，验证镜像关系
  if (pattern.isMirror) {
    return validateMirrorPattern(pattern);
  }
  
  return true;
}

/**
 * 验证图案序列是否有效
 */
export function validatePatterns(patterns: BilateralPattern[], config: BilateralConfig): boolean {
  // 检查数量
  if (patterns.length !== config.patternCount) {
    return false;
  }
  
  // 检查每个图案
  for (const pattern of patterns) {
    if (!validatePattern(pattern)) {
      return false;
    }
  }
  
  // 检查镜像比例（允许四舍五入误差）
  const mirrorCount = patterns.filter(p => p.isMirror).length;
  const expectedMirror = Math.round(config.patternCount * (config.mirrorRatio ?? 0.5));
  if (Math.abs(mirrorCount - expectedMirror) > 1) {
    return false;
  }
  
  return true;
}
