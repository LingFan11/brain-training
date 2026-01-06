/**
 * AuditoryEngine - 听觉选择性注意训练引擎
 * 实现听觉注意训练的核心逻辑：试次生成、响应记录、统计计算
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
 */

// 中文语音刺激类型
export const CHINESE_SOUNDS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
export type ChineseSound = typeof CHINESE_SOUNDS[number];

// 音频文件映射（使用Web Speech API或预录音频）
export const SOUND_MAP: Record<ChineseSound, string> = {
  '一': 'yi',
  '二': 'er',
  '三': 'san',
  '四': 'si',
  '五': 'wu',
  '六': 'liu',
  '七': 'qi',
  '八': 'ba',
  '九': 'jiu',
};

export interface AuditoryConfig {
  targetSound: ChineseSound;    // 目标声音
  targetRatio: number;          // 目标比例 (0-1)
  trialCount: number;           // 试次数量
  difficulty?: number;          // 1-10
  stimulusDuration?: number;    // 刺激呈现时间(ms)
  interStimulusInterval?: number; // 刺激间隔(ms)
}

export interface AuditoryTrial {
  sound: ChineseSound;          // 播放的声音
  isTarget: boolean;            // 是否为目标声音
  index: number;
}

export interface AuditoryResponse {
  index: number;
  responded: boolean;           // 用户是否按下了响应按钮
  isTarget: boolean;            // 实际是否为目标
  hit: boolean;                 // 正确识别目标
  miss: boolean;                // 漏报目标
  falseAlarm: boolean;          // 误报非目标
  correctRejection: boolean;    // 正确拒绝非目标
  rt: number | null;            // 反应时间（毫秒）
}

export interface AuditoryState {
  trials: AuditoryTrial[];
  currentIndex: number;
  responses: AuditoryResponse[];
  startTime: number | null;
  trialStartTime: number | null;
  isComplete: boolean;
  phase: 'ready' | 'running' | 'complete';
  targetSound: ChineseSound;
}

export interface AuditoryResult {
  score: number;
  accuracy: number;
  duration: number;
  hitRate: number;              // 命中率 = hits / targets
  falseAlarmRate: number;       // 误报率 = falseAlarms / nonTargets
  dPrime: number;               // 信号检测论指标
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  avgResponseTime: number;
  totalTrials: number;
}


/**
 * 生成单个听觉试次
 */
export function generateAuditoryTrial(
  targetSound: ChineseSound,
  isTarget: boolean,
  index: number
): AuditoryTrial {
  let sound: ChineseSound;
  
  if (isTarget) {
    sound = targetSound;
  } else {
    // 选择一个非目标声音
    const otherSounds = CHINESE_SOUNDS.filter(s => s !== targetSound);
    const soundIndex = Math.floor(Math.random() * otherSounds.length);
    sound = otherSounds[soundIndex];
  }
  
  return {
    sound,
    isTarget,
    index,
  };
}

/**
 * 生成听觉试次序列
 * 根据配置的目标比例生成指定数量的试次
 */
export function generateAuditoryTrials(config: AuditoryConfig): AuditoryTrial[] {
  const { targetSound, targetRatio, trialCount } = config;
  
  // 计算目标和非目标试次的数量
  const targetCount = Math.round(trialCount * targetRatio);
  const nonTargetCount = trialCount - targetCount;
  
  // 生成试次类型数组
  const trialTypes: boolean[] = [];
  for (let i = 0; i < targetCount; i++) {
    trialTypes.push(true);
  }
  for (let i = 0; i < nonTargetCount; i++) {
    trialTypes.push(false);
  }
  
  // 随机打乱顺序
  for (let i = trialTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trialTypes[i], trialTypes[j]] = [trialTypes[j], trialTypes[i]];
  }
  
  // 生成试次
  const trials: AuditoryTrial[] = trialTypes.map((isTarget, index) =>
    generateAuditoryTrial(targetSound, isTarget, index)
  );
  
  return trials;
}

/**
 * 创建初始状态
 */
export function createAuditoryInitialState(config: AuditoryConfig): AuditoryState {
  return {
    trials: generateAuditoryTrials(config),
    currentIndex: 0,
    responses: [],
    startTime: null,
    trialStartTime: null,
    isComplete: false,
    phase: 'ready',
    targetSound: config.targetSound,
  };
}

/**
 * AuditoryEngine 类 - 处理听觉注意训练的状态和逻辑
 */
export class AuditoryEngine {
  private state: AuditoryState;
  private config: AuditoryConfig;

  constructor(config: AuditoryConfig) {
    this.config = {
      ...config,
      stimulusDuration: config.stimulusDuration ?? 500,
      interStimulusInterval: config.interStimulusInterval ?? 1000,
    };
    this.state = createAuditoryInitialState(this.config);
  }

  /**
   * 获取当前状态
   */
  getState(): AuditoryState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): AuditoryConfig {
    return { ...this.config };
  }

  /**
   * 开始训练
   */
  start(): void {
    if (this.state.phase === 'ready') {
      this.state.startTime = Date.now();
      this.state.trialStartTime = Date.now();
      this.state.phase = 'running';
    }
  }

  /**
   * 获取当前试次
   */
  getCurrentTrial(): AuditoryTrial | null {
    if (this.state.isComplete || this.state.currentIndex >= this.state.trials.length) {
      return null;
    }
    return this.state.trials[this.state.currentIndex];
  }

  /**
   * 处理用户响应（按下响应按钮表示识别到目标）
   */
  respond(): AuditoryResponse | null {
    if (this.state.isComplete || this.state.phase !== 'running') {
      return null;
    }

    const currentTrial = this.getCurrentTrial();
    if (!currentTrial) {
      return null;
    }

    const now = Date.now();
    const rt = this.state.trialStartTime ? now - this.state.trialStartTime : null;
    const isTarget = currentTrial.isTarget;

    // 计算响应类型
    const hit = isTarget;           // 响应了目标
    const falseAlarm = !isTarget;   // 响应了非目标

    const response: AuditoryResponse = {
      index: this.state.currentIndex,
      responded: true,
      isTarget,
      hit,
      miss: false,
      falseAlarm,
      correctRejection: false,
      rt,
    };

    this.state.responses.push(response);
    return response;
  }

  /**
   * 前进到下一个试次（不响应当前试次）
   */
  advance(): boolean {
    if (this.state.isComplete) {
      return false;
    }

    // 如果当前项没有响应，记录为未响应
    if (this.state.responses.length <= this.state.currentIndex) {
      const currentTrial = this.getCurrentTrial();
      if (currentTrial) {
        this.state.responses.push({
          index: this.state.currentIndex,
          responded: false,
          isTarget: currentTrial.isTarget,
          hit: false,
          miss: currentTrial.isTarget,       // 漏报目标
          falseAlarm: false,
          correctRejection: !currentTrial.isTarget,  // 正确拒绝非目标
          rt: null,
        });
      }
    }

    this.state.currentIndex++;
    this.state.trialStartTime = Date.now();

    // 检查是否完成
    if (this.state.currentIndex >= this.state.trials.length) {
      this.state.isComplete = true;
      this.state.phase = 'complete';
    }

    return !this.state.isComplete;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createAuditoryInitialState(this.config);
  }

  /**
   * 更新配置并重置
   */
  setConfig(config: Partial<AuditoryConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }


  /**
   * 计算训练结果
   */
  calculateResult(): AuditoryResult {
    const responses = this.state.responses;
    
    // 统计各类响应
    const hits = responses.filter(r => r.hit).length;
    const misses = responses.filter(r => r.miss).length;
    const falseAlarms = responses.filter(r => r.falseAlarm).length;
    const correctRejections = responses.filter(r => r.correctRejection).length;
    
    const targets = hits + misses;
    const nonTargets = falseAlarms + correctRejections;
    
    // 计算命中率和误报率
    const hitRate = targets > 0 ? hits / targets : 0;
    const falseAlarmRate = nonTargets > 0 ? falseAlarms / nonTargets : 0;
    
    // 计算d' (信号检测论指标)
    const correctedHitRate = Math.min(Math.max(hitRate, 0.01), 0.99);
    const correctedFARate = Math.min(Math.max(falseAlarmRate, 0.01), 0.99);
    const dPrime = this.zScore(correctedHitRate) - this.zScore(correctedFARate);
    
    // 计算准确率
    const totalResponses = responses.length;
    const correctResponses = hits + correctRejections;
    const accuracy = totalResponses > 0 ? correctResponses / totalResponses : 0;
    
    // 计算平均反应时间（仅计算有响应的）
    const responsesWithRT = responses.filter(r => r.rt !== null && r.responded);
    const avgResponseTime = responsesWithRT.length > 0
      ? responsesWithRT.reduce((sum, r) => sum + (r.rt || 0), 0) / responsesWithRT.length
      : 0;
    
    // 计算总时长
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    // 计算分数
    // 基础分 = 正确数 * 10
    // d'奖励 = d' * 20
    // 速度奖励 = 基于平均反应时间
    const baseScore = correctResponses * 10;
    const dPrimeBonus = Math.max(0, Math.round(dPrime * 20));
    const speedBonus = avgResponseTime > 0 
      ? Math.max(0, Math.round((1000 - avgResponseTime) / 10))
      : 0;
    const score = Math.max(0, baseScore + dPrimeBonus + speedBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      hitRate: Math.round(hitRate * 100) / 100,
      falseAlarmRate: Math.round(falseAlarmRate * 100) / 100,
      dPrime: Math.round(dPrime * 100) / 100,
      hits,
      misses,
      falseAlarms,
      correctRejections,
      avgResponseTime: Math.round(avgResponseTime),
      totalTrials: responses.length,
    };
  }

  /**
   * Z分数转换（用于d'计算）
   */
  private zScore(p: number): number {
    if (p <= 0) return -3;
    if (p >= 1) return 3;
    
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;
    
    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;
    
    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;
    
    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    let q: number, r: number;
    
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
             ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
             (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
              ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
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
  getTrials(): AuditoryTrial[] {
    return [...this.state.trials];
  }

  /**
   * 获取目标声音
   */
  getTargetSound(): ChineseSound {
    return this.state.targetSound;
  }
}


/**
 * 根据难度获取配置
 */
export function getAuditoryConfigFromDifficulty(difficulty: number): AuditoryConfig {
  // 难度1-10
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  // 随机选择目标声音
  const targetSound = CHINESE_SOUNDS[Math.floor(Math.random() * CHINESE_SOUNDS.length)];
  
  // 目标比例从0.4（简单）到0.2（困难）
  const targetRatio = 0.4 - (normalizedDifficulty - 1) * 0.022;
  
  // 试次数量从15（简单）到30（困难）
  const trialCount = 15 + Math.floor((normalizedDifficulty - 1) * 1.67);
  
  // 刺激间隔从1500ms（简单）到800ms（困难）
  const interStimulusInterval = 1500 - Math.floor((normalizedDifficulty - 1) * 78);
  
  return {
    targetSound,
    targetRatio: Math.round(targetRatio * 100) / 100,
    trialCount,
    difficulty: normalizedDifficulty,
    stimulusDuration: 500,
    interStimulusInterval,
  };
}

/**
 * 验证试次是否有效
 */
export function validateAuditoryTrial(trial: AuditoryTrial, targetSound: ChineseSound): boolean {
  // 检查声音是否有效
  if (!CHINESE_SOUNDS.includes(trial.sound)) {
    return false;
  }
  
  // 检查目标标记是否正确
  const shouldBeTarget = trial.sound === targetSound;
  if (trial.isTarget !== shouldBeTarget) {
    return false;
  }
  
  return true;
}

/**
 * 验证试次序列是否有效
 */
export function validateAuditoryTrials(trials: AuditoryTrial[], config: AuditoryConfig): boolean {
  // 检查数量
  if (trials.length !== config.trialCount) {
    return false;
  }
  
  // 检查每个试次
  for (let i = 0; i < trials.length; i++) {
    if (!validateAuditoryTrial(trials[i], config.targetSound)) {
      return false;
    }
    if (trials[i].index !== i) {
      return false;
    }
  }
  
  // 检查目标比例（允许四舍五入误差）
  const targetCount = trials.filter(t => t.isTarget).length;
  const expectedTargets = Math.round(config.trialCount * config.targetRatio);
  if (Math.abs(targetCount - expectedTargets) > 1) {
    return false;
  }
  
  return true;
}

/**
 * 记录响应并计算响应类型
 * 用于外部调用时的辅助函数
 */
export function recordResponse(
  responded: boolean,
  isTarget: boolean,
  rt: number | null,
  index: number
): AuditoryResponse {
  return {
    index,
    responded,
    isTarget,
    hit: responded && isTarget,
    miss: !responded && isTarget,
    falseAlarm: responded && !isTarget,
    correctRejection: !responded && !isTarget,
    rt,
  };
}

/**
 * 计算统计数据
 * 用于外部调用时的辅助函数
 */
export function calculateAuditoryStats(responses: AuditoryResponse[]): {
  hitRate: number;
  falseAlarmRate: number;
  accuracy: number;
} {
  const hits = responses.filter(r => r.hit).length;
  const misses = responses.filter(r => r.miss).length;
  const falseAlarms = responses.filter(r => r.falseAlarm).length;
  const correctRejections = responses.filter(r => r.correctRejection).length;
  
  const targets = hits + misses;
  const nonTargets = falseAlarms + correctRejections;
  
  const hitRate = targets > 0 ? hits / targets : 0;
  const falseAlarmRate = nonTargets > 0 ? falseAlarms / nonTargets : 0;
  const accuracy = responses.length > 0 
    ? (hits + correctRejections) / responses.length 
    : 0;
  
  return {
    hitRate: Math.round(hitRate * 100) / 100,
    falseAlarmRate: Math.round(falseAlarmRate * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
  };
}
