/**
 * SequenceEngine - 序列工作记忆训练引擎 (N-back)
 * 实现序列记忆训练的核心逻辑：序列生成、N-back匹配检测、自适应难度调节
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */

export type StimulusType = 'number' | 'letter' | 'position';

// 刺激素材
export const NUMBER_STIMULI = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const LETTER_STIMULI = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'] as const;
export const POSITION_STIMULI = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const; // 3x3网格位置

export interface SequenceConfig {
  nBack: number;            // N值 (1-4)
  sequenceLength: number;   // 序列长度
  stimulusType: StimulusType;
  targetRatio?: number;     // 目标（匹配）比例，默认0.3
  difficulty?: number;      // 1-10
}

export interface SequenceItem {
  stimulus: string;
  isTarget: boolean;        // 是否为N-back匹配目标
  index: number;
}

export interface SequenceResponse {
  index: number;
  responded: boolean;       // 用户是否按下了"匹配"按钮
  isTarget: boolean;        // 实际是否为目标
  hit: boolean;             // 正确识别目标
  miss: boolean;            // 漏报目标
  falseAlarm: boolean;      // 误报非目标
  correctRejection: boolean; // 正确拒绝非目标
  rt: number | null;        // 反应时间（毫秒）
}

export interface SequenceState {
  sequence: SequenceItem[];
  currentIndex: number;
  responses: SequenceResponse[];
  startTime: number | null;
  itemStartTime: number | null;
  isComplete: boolean;
  phase: 'ready' | 'running' | 'complete';
}

export interface SequenceResult {
  score: number;
  accuracy: number;
  duration: number;
  nBack: number;
  sequenceLength: number;
  hitRate: number;          // 命中率 = hits / targets
  falseAlarmRate: number;   // 误报率 = falseAlarms / nonTargets
  dPrime: number;           // 信号检测论指标
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  avgResponseTime: number;
}

/**
 * 获取刺激素材列表
 */
export function getStimuliForType(type: StimulusType): readonly string[] {
  switch (type) {
    case 'number':
      return NUMBER_STIMULI;
    case 'letter':
      return LETTER_STIMULI;
    case 'position':
      return POSITION_STIMULI;
  }
}

/**
 * 生成随机刺激
 */
function getRandomStimulus(type: StimulusType): string {
  const stimuli = getStimuliForType(type);
  return stimuli[Math.floor(Math.random() * stimuli.length)];
}

/**
 * 检测N-back匹配
 * 对于位置i >= N，检查sequence[i]是否等于sequence[i-N]
 */
export function detectNBackMatch(sequence: string[], index: number, nBack: number): boolean {
  if (index < nBack) {
    return false;
  }
  return sequence[index] === sequence[index - nBack];
}


/**
 * 生成序列
 * 根据配置生成指定长度的序列，确保目标比例接近配置值
 */
export function generateSequence(config: SequenceConfig): SequenceItem[] {
  const { nBack, sequenceLength, stimulusType, targetRatio = 0.3 } = config;
  
  // 计算可能成为目标的位置数量（从nBack开始）
  const possibleTargetPositions = sequenceLength - nBack;
  const targetCount = Math.round(possibleTargetPositions * targetRatio);
  
  // 决定哪些位置是目标
  const targetPositions = new Set<number>();
  const availablePositions = Array.from(
    { length: possibleTargetPositions }, 
    (_, i) => i + nBack
  );
  
  // 随机选择目标位置
  for (let i = 0; i < targetCount && availablePositions.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    targetPositions.add(availablePositions[randomIndex]);
    availablePositions.splice(randomIndex, 1);
  }
  
  // 生成序列
  const stimuli: string[] = [];
  const sequence: SequenceItem[] = [];
  
  for (let i = 0; i < sequenceLength; i++) {
    let stimulus: string;
    const isTarget = targetPositions.has(i);
    
    if (isTarget && i >= nBack) {
      // 目标位置：复制N步前的刺激
      stimulus = stimuli[i - nBack];
    } else if (i >= nBack && !isTarget) {
      // 非目标位置：确保不与N步前相同
      const nBackStimulus = stimuli[i - nBack];
      do {
        stimulus = getRandomStimulus(stimulusType);
      } while (stimulus === nBackStimulus);
    } else {
      // 前N个位置：随机生成
      stimulus = getRandomStimulus(stimulusType);
    }
    
    stimuli.push(stimulus);
    sequence.push({
      stimulus,
      isTarget,
      index: i,
    });
  }
  
  return sequence;
}

/**
 * 创建初始状态
 */
export function createSequenceInitialState(config: SequenceConfig): SequenceState {
  return {
    sequence: generateSequence(config),
    currentIndex: 0,
    responses: [],
    startTime: null,
    itemStartTime: null,
    isComplete: false,
    phase: 'ready',
  };
}

/**
 * SequenceEngine 类 - 处理序列记忆训练的状态和逻辑
 */
export class SequenceEngine {
  private state: SequenceState;
  private config: SequenceConfig;

  constructor(config: SequenceConfig) {
    this.config = {
      ...config,
      targetRatio: config.targetRatio ?? 0.3,
    };
    this.state = createSequenceInitialState(this.config);
  }

  /**
   * 获取当前状态
   */
  getState(): SequenceState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): SequenceConfig {
    return { ...this.config };
  }

  /**
   * 开始训练
   */
  start(): void {
    if (this.state.phase === 'ready') {
      this.state.startTime = Date.now();
      this.state.itemStartTime = Date.now();
      this.state.phase = 'running';
    }
  }

  /**
   * 获取当前刺激项
   */
  getCurrentItem(): SequenceItem | null {
    if (this.state.isComplete || this.state.currentIndex >= this.state.sequence.length) {
      return null;
    }
    return this.state.sequence[this.state.currentIndex];
  }

  /**
   * 处理用户响应（按下"匹配"按钮）
   */
  respond(isMatch: boolean): SequenceResponse | null {
    if (this.state.isComplete || this.state.phase !== 'running') {
      return null;
    }

    const currentItem = this.getCurrentItem();
    if (!currentItem) {
      return null;
    }

    const now = Date.now();
    const rt = this.state.itemStartTime ? now - this.state.itemStartTime : null;
    const isTarget = currentItem.isTarget;

    // 计算响应类型
    const hit = isMatch && isTarget;
    const miss = !isMatch && isTarget;
    const falseAlarm = isMatch && !isTarget;
    const correctRejection = !isMatch && !isTarget;

    const response: SequenceResponse = {
      index: this.state.currentIndex,
      responded: isMatch,
      isTarget,
      hit,
      miss,
      falseAlarm,
      correctRejection,
      rt,
    };

    this.state.responses.push(response);
    return response;
  }

  /**
   * 前进到下一个刺激
   */
  advance(): boolean {
    if (this.state.isComplete) {
      return false;
    }

    // 如果当前项没有响应，记录为未响应
    if (this.state.responses.length <= this.state.currentIndex) {
      const currentItem = this.getCurrentItem();
      if (currentItem) {
        this.state.responses.push({
          index: this.state.currentIndex,
          responded: false,
          isTarget: currentItem.isTarget,
          hit: false,
          miss: currentItem.isTarget,
          falseAlarm: false,
          correctRejection: !currentItem.isTarget,
          rt: null,
        });
      }
    }

    this.state.currentIndex++;
    this.state.itemStartTime = Date.now();

    // 检查是否完成
    if (this.state.currentIndex >= this.state.sequence.length) {
      this.state.isComplete = true;
      this.state.phase = 'complete';
    }

    return !this.state.isComplete;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createSequenceInitialState(this.config);
  }

  /**
   * 更新配置并重置
   */
  setConfig(config: Partial<SequenceConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }


  /**
   * 计算训练结果
   */
  calculateResult(): SequenceResult {
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
    // 使用修正的命中率和误报率避免无穷大
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
    // 基础分 = 正确数 * 10 * nBack
    // d'奖励 = d' * 20
    const baseScore = correctResponses * 10 * this.config.nBack;
    const dPrimeBonus = Math.max(0, Math.round(dPrime * 20));
    const score = Math.max(0, baseScore + dPrimeBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      nBack: this.config.nBack,
      sequenceLength: this.config.sequenceLength,
      hitRate: Math.round(hitRate * 100) / 100,
      falseAlarmRate: Math.round(falseAlarmRate * 100) / 100,
      dPrime: Math.round(dPrime * 100) / 100,
      hits,
      misses,
      falseAlarms,
      correctRejections,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  /**
   * Z分数转换（用于d'计算）
   */
  private zScore(p: number): number {
    // 使用近似公式计算标准正态分布的逆函数
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
      total: this.state.sequence.length,
    };
  }

  /**
   * 获取序列
   */
  getSequence(): SequenceItem[] {
    return [...this.state.sequence];
  }
}


/**
 * 自适应难度调节
 * 根据最近的表现调整难度
 * 高准确率(>80%)提升难度，低准确率(<50%)降低难度
 */
export function adjustDifficulty(
  currentConfig: SequenceConfig,
  accuracy: number
): SequenceConfig {
  const newConfig = { ...currentConfig };
  
  if (accuracy > 0.8) {
    // 高准确率：提升难度
    // 优先增加N值，其次增加序列长度
    if (newConfig.nBack < 4) {
      newConfig.nBack++;
    } else if (newConfig.sequenceLength < 30) {
      newConfig.sequenceLength += 5;
    }
    newConfig.difficulty = Math.min(10, (newConfig.difficulty || 5) + 1);
  } else if (accuracy < 0.5) {
    // 低准确率：降低难度
    // 优先减少N值，其次减少序列长度
    if (newConfig.nBack > 1) {
      newConfig.nBack--;
    } else if (newConfig.sequenceLength > 10) {
      newConfig.sequenceLength -= 5;
    }
    newConfig.difficulty = Math.max(1, (newConfig.difficulty || 5) - 1);
  }
  // 准确率在50%-80%之间：保持当前难度
  
  return newConfig;
}

/**
 * 根据难度获取配置
 */
export function getSequenceConfigFromDifficulty(difficulty: number): SequenceConfig {
  // 难度1-10
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  // N值从1（简单）到4（困难）
  const nBack = Math.min(4, Math.ceil(normalizedDifficulty / 2.5));
  
  // 序列长度从10（简单）到25（困难）
  const sequenceLength = 10 + Math.floor((normalizedDifficulty - 1) * 1.67);
  
  // 目标比例保持在0.3左右
  const targetRatio = 0.3;
  
  return {
    nBack,
    sequenceLength,
    stimulusType: 'letter',
    targetRatio,
    difficulty: normalizedDifficulty,
  };
}

/**
 * 验证序列是否有效
 */
export function validateSequence(sequence: SequenceItem[], config: SequenceConfig): boolean {
  // 检查长度
  if (sequence.length !== config.sequenceLength) {
    return false;
  }
  
  // 检查每个项的索引
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i].index !== i) {
      return false;
    }
  }
  
  // 检查N-back匹配标记是否正确
  const stimuli = sequence.map(item => item.stimulus);
  for (let i = 0; i < sequence.length; i++) {
    const isActualMatch = detectNBackMatch(stimuli, i, config.nBack);
    if (sequence[i].isTarget !== isActualMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * 验证刺激是否有效
 */
export function validateStimulus(stimulus: string, type: StimulusType): boolean {
  const validStimuli = getStimuliForType(type);
  return validStimuli.includes(stimulus as never);
}
