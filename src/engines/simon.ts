/**
 * SimonEngine - 声音序列记忆训练引擎
 * Simon Says 风格的听觉记忆游戏
 */

// 声音类型定义
export const SIMON_SOUNDS = [
  { id: 'dog', name: '狗', icon: '🐕', freq: 200 },
  { id: 'cat', name: '猫', icon: '🐱', freq: 400 },
  { id: 'bird', name: '鸟', icon: '🐦', freq: 600 },
  { id: 'cow', name: '牛', icon: '🐮', freq: 150 },
  { id: 'frog', name: '蛙', icon: '🐸', freq: 300 },
  { id: 'lion', name: '狮', icon: '🦁', freq: 120 },
] as const;

export type SoundId = typeof SIMON_SOUNDS[number]['id'];

export interface SimonSound {
  id: SoundId;
  name: string;
  icon: string;
  freq: number;
}

// 游戏阶段
export type SimonPhase = 'setup' | 'watch' | 'repeat' | 'feedback' | 'result';

// 配置
export interface SimonConfig {
  difficulty: number;
  startLength: number;      // 起始序列长度
  maxLength: number;        // 最大序列长度
  soundCount: number;       // 使用的声音数量 (3-6)
  playSpeed: number;        // 播放速度(ms)
  lives: number;            // 生命数
}

// 回合结果
export interface RoundResult {
  round: number;
  sequenceLength: number;
  correct: boolean;
  userSequence: SoundId[];
  correctSequence: SoundId[];
}

// 游戏状态
export interface SimonState {
  phase: SimonPhase;
  activeSounds: SimonSound[];     // 当前使用的声音
  sequence: SoundId[];            // 当前序列
  userInput: SoundId[];           // 用户输入
  currentPlayIndex: number;       // 当前播放位置
  round: number;                  // 当前回合
  lives: number;                  // 剩余生命
  maxLives: number;
  roundResults: RoundResult[];
  startTime: number | null;
  isComplete: boolean;
  lastRoundCorrect: boolean | null;
  highestLength: number;          // 达到的最长序列
}

// 结果
export interface SimonResult {
  score: number;
  accuracy: number;
  duration: number;
  totalRounds: number;
  correctRounds: number;
  highestLength: number;
  avgSequenceLength: number;
}

/**
 * 根据难度获取配置
 */
export function getSimonConfigFromDifficulty(difficulty: number): SimonConfig {
  const d = Math.max(1, Math.min(10, difficulty));
  
  return {
    difficulty: d,
    startLength: d <= 3 ? 2 : d <= 6 ? 3 : 4,
    maxLength: 12 + d,
    soundCount: d <= 2 ? 3 : d <= 5 ? 4 : d <= 8 ? 5 : 6,
    playSpeed: Math.max(400, 800 - (d - 1) * 40),
    lives: d <= 3 ? 3 : d <= 6 ? 2 : 1,
  };
}

/**
 * 随机选择元素
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生成随机序列
 */
function generateSequence(sounds: SimonSound[], length: number): SoundId[] {
  const sequence: SoundId[] = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * sounds.length);
    sequence.push(sounds[randomIndex].id);
  }
  return sequence;
}

/**
 * 创建初始状态
 */
export function createSimonInitialState(config: SimonConfig): SimonState {
  // 选择使用的声音
  const activeSounds = shuffle([...SIMON_SOUNDS]).slice(0, config.soundCount);
  
  // 生成初始序列
  const sequence = generateSequence(activeSounds, config.startLength);
  
  return {
    phase: 'setup',
    activeSounds,
    sequence,
    userInput: [],
    currentPlayIndex: -1,
    round: 1,
    lives: config.lives,
    maxLives: config.lives,
    roundResults: [],
    startTime: null,
    isComplete: false,
    lastRoundCorrect: null,
    highestLength: 0,
  };
}

/**
 * SimonEngine 类
 */
export class SimonEngine {
  private state: SimonState;
  private config: SimonConfig;

  constructor(config: SimonConfig) {
    this.config = config;
    this.state = createSimonInitialState(config);
  }

  getState(): SimonState {
    return { ...this.state };
  }

  getConfig(): SimonConfig {
    return { ...this.config };
  }

  getActiveSounds(): SimonSound[] {
    return [...this.state.activeSounds];
  }

  getSequence(): SoundId[] {
    return [...this.state.sequence];
  }

  getSequenceLength(): number {
    return this.state.sequence.length;
  }

  getUserInput(): SoundId[] {
    return [...this.state.userInput];
  }

  getRound(): number {
    return this.state.round;
  }

  getLives(): number {
    return this.state.lives;
  }

  getMaxLives(): number {
    return this.state.maxLives;
  }

  getPhase(): SimonPhase {
    return this.state.phase;
  }

  getCurrentPlayIndex(): number {
    return this.state.currentPlayIndex;
  }

  getHighestLength(): number {
    return this.state.highestLength;
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  getLastRoundCorrect(): boolean | null {
    return this.state.lastRoundCorrect;
  }

  /**
   * 开始游戏
   */
  start(): void {
    if (this.state.phase === 'setup') {
      this.state.startTime = Date.now();
      this.state.phase = 'watch';
      this.state.currentPlayIndex = 0;
    }
  }

  /**
   * 设置当前播放索引（用于动画同步）
   */
  setPlayIndex(index: number): void {
    this.state.currentPlayIndex = index;
  }

  /**
   * 播放完成，进入用户输入阶段
   */
  finishPlaying(): void {
    if (this.state.phase === 'watch') {
      this.state.phase = 'repeat';
      this.state.currentPlayIndex = -1;
      this.state.userInput = [];
    }
  }

  /**
   * 用户输入
   */
  input(soundId: SoundId): { correct: boolean; complete: boolean; roundComplete: boolean } {
    if (this.state.phase !== 'repeat') {
      return { correct: false, complete: false, roundComplete: false };
    }

    const inputIndex = this.state.userInput.length;
    const expectedSound = this.state.sequence[inputIndex];
    const correct = soundId === expectedSound;

    this.state.userInput.push(soundId);

    // 检查是否输入错误
    if (!correct) {
      return this.handleWrongInput();
    }

    // 检查是否完成当前序列
    if (this.state.userInput.length === this.state.sequence.length) {
      return this.handleRoundComplete(true);
    }

    return { correct: true, complete: false, roundComplete: false };
  }

  /**
   * 处理错误输入
   */
  private handleWrongInput(): { correct: boolean; complete: boolean; roundComplete: boolean } {
    this.state.lives--;
    
    // 记录回合结果
    this.state.roundResults.push({
      round: this.state.round,
      sequenceLength: this.state.sequence.length,
      correct: false,
      userSequence: [...this.state.userInput],
      correctSequence: [...this.state.sequence],
    });

    this.state.lastRoundCorrect = false;
    this.state.phase = 'feedback';

    // 检查是否游戏结束
    if (this.state.lives <= 0) {
      this.state.isComplete = true;
      this.state.phase = 'result';
      return { correct: false, complete: true, roundComplete: true };
    }

    return { correct: false, complete: false, roundComplete: true };
  }

  /**
   * 处理回合完成
   */
  private handleRoundComplete(correct: boolean): { correct: boolean; complete: boolean; roundComplete: boolean } {
    // 更新最高长度
    if (correct && this.state.sequence.length > this.state.highestLength) {
      this.state.highestLength = this.state.sequence.length;
    }

    // 记录回合结果
    this.state.roundResults.push({
      round: this.state.round,
      sequenceLength: this.state.sequence.length,
      correct,
      userSequence: [...this.state.userInput],
      correctSequence: [...this.state.sequence],
    });

    this.state.lastRoundCorrect = correct;
    this.state.phase = 'feedback';

    // 检查是否达到最大长度
    if (this.state.sequence.length >= this.config.maxLength) {
      this.state.isComplete = true;
      this.state.phase = 'result';
      return { correct: true, complete: true, roundComplete: true };
    }

    return { correct: true, complete: false, roundComplete: true };
  }

  /**
   * 进入下一回合
   */
  nextRound(): void {
    if (this.state.phase !== 'feedback' || this.state.isComplete) return;

    this.state.round++;
    
    // 增加序列长度（在原序列基础上添加一个）
    const newSound = this.state.activeSounds[
      Math.floor(Math.random() * this.state.activeSounds.length)
    ];
    this.state.sequence.push(newSound.id);
    
    // 重置用户输入
    this.state.userInput = [];
    this.state.currentPlayIndex = 0;
    this.state.lastRoundCorrect = null;
    this.state.phase = 'watch';
  }

  /**
   * 重试当前回合（错误后）
   */
  retryRound(): void {
    if (this.state.phase !== 'feedback' || this.state.isComplete) return;

    // 生成新序列（保持相同长度）
    this.state.sequence = generateSequence(this.state.activeSounds, this.state.sequence.length);
    this.state.userInput = [];
    this.state.currentPlayIndex = 0;
    this.state.lastRoundCorrect = null;
    this.state.phase = 'watch';
  }

  /**
   * 计算结果
   */
  calculateResult(): SimonResult {
    const results = this.state.roundResults;
    const correctRounds = results.filter(r => r.correct).length;
    const totalRounds = results.length;
    
    const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
    
    const avgLength = totalRounds > 0
      ? results.reduce((sum, r) => sum + r.sequenceLength, 0) / totalRounds
      : 0;
    
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    // 计算分数
    const lengthScore = this.state.highestLength * 50;
    const roundScore = correctRounds * 20;
    const difficultyBonus = this.config.difficulty * 15;
    const accuracyBonus = Math.round(accuracy * 100);
    const score = lengthScore + roundScore + difficultyBonus + accuracyBonus;

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 10) / 10,
      totalRounds,
      correctRounds,
      highestLength: this.state.highestLength,
      avgSequenceLength: Math.round(avgLength * 10) / 10,
    };
  }

  /**
   * 重置游戏
   */
  reset(): void {
    this.state = createSimonInitialState(this.config);
  }
}

/**
 * 播放声音（使用 Web Audio API）
 */
export function playTone(frequency: number, duration: number = 200): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
      setTimeout(() => {
        audioContext.close();
        resolve();
      }, duration);
    } catch {
      resolve();
    }
  });
}
