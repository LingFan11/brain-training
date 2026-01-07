/**
 * SequenceEngine - Corsi 方块测试引擎
 * 实现视觉空间工作记忆训练：方块位置生成、序列闪烁、用户输入验证
 */

// 方块配置
export const BLOCK_COUNT = 9;
export const MIN_SEQUENCE_LENGTH = 2;
export const MAX_SEQUENCE_LENGTH = 9;

export interface BlockPosition {
  id: number;
  x: number; // 0-100 百分比
  y: number; // 0-100 百分比
}

export interface CorsiConfig {
  difficulty: number;        // 1-10
  startLength: number;       // 起始序列长度
  maxLength: number;         // 最大序列长度
  displayTime: number;       // 每个方块闪烁时间(ms)
  intervalTime: number;      // 方块间隔时间(ms)
  maxErrors: number;         // 最大允许错误次数
  isReverse: boolean;        // 是否倒序模式
}

export interface CorsiRound {
  sequence: number[];        // 闪烁的方块ID序列
  userInput: number[];       // 用户输入的序列
  isCorrect: boolean | null; // 本轮是否正确
  startTime: number | null;
  endTime: number | null;
}

export type CorsiPhase = 'ready' | 'showing' | 'input' | 'feedback' | 'complete';

export interface CorsiState {
  blocks: BlockPosition[];
  currentRound: number;
  rounds: CorsiRound[];
  currentSequenceLength: number;
  phase: CorsiPhase;
  currentShowIndex: number;
  errorCount: number;
  maxSpan: number;
  startTime: number | null;
  isComplete: boolean;
}

export interface CorsiResult {
  score: number;
  maxSpan: number;
  totalRounds: number;
  correctRounds: number;
  errorCount: number;
  accuracy: number;
  duration: number;
  avgResponseTime: number;
  isReverse: boolean;
}


/**
 * 生成随机分布的方块位置
 */
export function generateBlockPositions(): BlockPosition[] {
  const blocks: BlockPosition[] = [];
  const minDistance = 18;
  const padding = 12;
  
  for (let i = 0; i < BLOCK_COUNT; i++) {
    let attempts = 0;
    let position: BlockPosition;
    
    do {
      position = {
        id: i,
        x: padding + Math.random() * (100 - 2 * padding),
        y: padding + Math.random() * (100 - 2 * padding),
      };
      attempts++;
    } while (
      attempts < 100 &&
      blocks.some(b => {
        const dx = b.x - position.x;
        const dy = b.y - position.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      })
    );
    
    blocks.push(position);
  }
  
  return blocks;
}

/**
 * 生成随机序列
 */
export function generateSequence(length: number, blockCount: number = BLOCK_COUNT): number[] {
  const sequence: number[] = [];
  const available = Array.from({ length: blockCount }, (_, i) => i);
  
  for (let i = 0; i < length; i++) {
    let validChoices = available;
    if (sequence.length > 0) {
      validChoices = available.filter(id => id !== sequence[sequence.length - 1]);
    }
    const randomIndex = Math.floor(Math.random() * validChoices.length);
    sequence.push(validChoices[randomIndex]);
  }
  
  return sequence;
}

/**
 * 验证用户输入
 */
export function validateInput(
  sequence: number[],
  userInput: number[],
  isReverse: boolean
): boolean {
  const expected = isReverse ? [...sequence].reverse() : sequence;
  if (userInput.length !== expected.length) return false;
  return userInput.every((id, index) => id === expected[index]);
}

/**
 * 创建初始状态
 */
export function createCorsiInitialState(config: CorsiConfig): CorsiState {
  return {
    blocks: generateBlockPositions(),
    currentRound: 0,
    rounds: [],
    currentSequenceLength: config.startLength,
    phase: 'ready',
    currentShowIndex: -1,
    errorCount: 0,
    maxSpan: 0,
    startTime: null,
    isComplete: false,
  };
}

/**
 * 根据难度获取配置
 */
export function getSequenceConfigFromDifficulty(difficulty: number): CorsiConfig {
  const d = Math.max(1, Math.min(10, difficulty));
  const startLength = Math.min(4, 2 + Math.floor((d - 1) / 3));
  const displayTime = Math.max(500, 1000 - (d - 1) * 50);
  const intervalTime = Math.max(200, 400 - (d - 1) * 20);
  const isReverse = d >= 7;
  
  return {
    difficulty: d,
    startLength,
    maxLength: MAX_SEQUENCE_LENGTH,
    displayTime,
    intervalTime,
    maxErrors: 2,
    isReverse,
  };
}


/**
 * SequenceEngine 类 - Corsi 方块测试
 */
export class SequenceEngine {
  private state: CorsiState;
  private config: CorsiConfig;

  constructor(config: CorsiConfig) {
    this.config = config;
    this.state = createCorsiInitialState(config);
  }

  getState(): CorsiState {
    return { ...this.state };
  }

  getConfig(): CorsiConfig {
    return { ...this.config };
  }

  getBlocks(): BlockPosition[] {
    return [...this.state.blocks];
  }

  start(): void {
    if (this.state.phase === 'ready') {
      this.state.startTime = Date.now();
      this.startNewRound();
    }
  }

  private startNewRound(): void {
    const sequence = generateSequence(this.state.currentSequenceLength);
    this.state.rounds.push({
      sequence,
      userInput: [],
      isCorrect: null,
      startTime: null,
      endTime: null,
    });
    this.state.currentRound = this.state.rounds.length - 1;
    this.state.phase = 'showing';
    this.state.currentShowIndex = -1;
  }

  getCurrentRound(): CorsiRound | null {
    if (this.state.currentRound < 0 || this.state.currentRound >= this.state.rounds.length) {
      return null;
    }
    return { ...this.state.rounds[this.state.currentRound] };
  }

  getCurrentSequenceLength(): number {
    return this.state.currentSequenceLength;
  }

  showNextBlock(): number | null {
    if (this.state.phase !== 'showing') return null;
    
    const round = this.state.rounds[this.state.currentRound];
    this.state.currentShowIndex++;
    
    if (this.state.currentShowIndex >= round.sequence.length) {
      this.state.phase = 'input';
      this.state.rounds[this.state.currentRound].startTime = Date.now();
      return null;
    }
    
    return round.sequence[this.state.currentShowIndex];
  }

  getCurrentHighlightedBlock(): number | null {
    if (this.state.phase !== 'showing' || this.state.currentShowIndex < 0) {
      return null;
    }
    const round = this.state.rounds[this.state.currentRound];
    if (this.state.currentShowIndex >= round.sequence.length) {
      return null;
    }
    return round.sequence[this.state.currentShowIndex];
  }

  tapBlock(blockId: number): { complete: boolean; correct: boolean } | null {
    if (this.state.phase !== 'input' || this.state.isComplete) {
      return null;
    }
    
    const round = this.state.rounds[this.state.currentRound];
    round.userInput.push(blockId);
    
    const expectedSequence = this.config.isReverse 
      ? [...round.sequence].reverse() 
      : round.sequence;
    
    const currentIndex = round.userInput.length - 1;
    const isCurrentCorrect = round.userInput[currentIndex] === expectedSequence[currentIndex];
    
    if (!isCurrentCorrect) {
      round.isCorrect = false;
      round.endTime = Date.now();
      this.state.errorCount++;
      this.state.phase = 'feedback';
      return { complete: true, correct: false };
    }
    
    if (round.userInput.length === round.sequence.length) {
      round.isCorrect = true;
      round.endTime = Date.now();
      this.state.maxSpan = Math.max(this.state.maxSpan, this.state.currentSequenceLength);
      this.state.phase = 'feedback';
      return { complete: true, correct: true };
    }
    
    return { complete: false, correct: true };
  }

  nextRound(): boolean {
    if (this.state.phase !== 'feedback') return false;
    
    const lastRound = this.state.rounds[this.state.currentRound];
    
    if (lastRound.isCorrect) {
      if (this.state.currentSequenceLength < this.config.maxLength) {
        this.state.currentSequenceLength++;
        this.startNewRound();
        return true;
      } else {
        this.state.isComplete = true;
        this.state.phase = 'complete';
        return false;
      }
    } else {
      if (this.state.errorCount >= this.config.maxErrors) {
        this.state.isComplete = true;
        this.state.phase = 'complete';
        return false;
      } else {
        this.startNewRound();
        return true;
      }
    }
  }

  calculateResult(): CorsiResult {
    const rounds = this.state.rounds;
    const correctRounds = rounds.filter(r => r.isCorrect === true).length;
    const totalRounds = rounds.length;
    
    const completedRounds = rounds.filter(r => r.startTime && r.endTime);
    const avgResponseTime = completedRounds.length > 0
      ? completedRounds.reduce((sum, r) => sum + (r.endTime! - r.startTime!), 0) / completedRounds.length
      : 0;
    
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
    const score = this.state.maxSpan * 100 + correctRounds * 20 + Math.round(accuracy * 50);

    return {
      score,
      maxSpan: this.state.maxSpan,
      totalRounds,
      correctRounds,
      errorCount: this.state.errorCount,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      isReverse: this.config.isReverse,
    };
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  getPhase(): CorsiPhase {
    return this.state.phase;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.state.currentSequenceLength,
      total: this.config.maxLength,
    };
  }

  reset(): void {
    this.state = createCorsiInitialState(this.config);
  }
}

// 类型别名
export type SequenceConfig = CorsiConfig;
export type SequenceResult = CorsiResult;
