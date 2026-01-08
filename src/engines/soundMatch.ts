/**
 * SoundMatchEngine - 声音配对记忆训练引擎
 * 翻牌配对游戏，用听觉代替视觉
 */

// 声音定义 - 使用 Web Speech API 的中文词语模拟不同声音
export const SOUND_ITEMS = [
  { id: 'dog', name: '狗', icon: '🐕', speech: '汪汪汪' },
  { id: 'cat', name: '猫', icon: '🐱', speech: '喵喵喵' },
  { id: 'bird', name: '鸟', icon: '🐦', speech: '叽叽喳喳' },
  { id: 'cow', name: '牛', icon: '🐮', speech: '哞哞哞' },
  { id: 'frog', name: '蛙', icon: '🐸', speech: '呱呱呱' },
  { id: 'sheep', name: '羊', icon: '🐑', speech: '咩咩咩' },
  { id: 'pig', name: '猪', icon: '🐷', speech: '哼哼哼' },
  { id: 'duck', name: '鸭', icon: '🦆', speech: '嘎嘎嘎' },
  { id: 'rooster', name: '鸡', icon: '🐓', speech: '喔喔喔' },
  { id: 'bee', name: '蜜蜂', icon: '🐝', speech: '嗡嗡嗡' },
] as const;

export type SoundId = typeof SOUND_ITEMS[number]['id'];

export interface SoundItem {
  id: SoundId;
  name: string;
  icon: string;
  speech: string;
}

// 卡片状态
export type CardState = 'hidden' | 'revealed' | 'matched';

// 卡片定义
export interface Card {
  id: string;
  soundId: SoundId;
  state: CardState;
  position: number;
}

// 游戏阶段
export type MatchPhase = 'setup' | 'playing' | 'result';

// 配置
export interface SoundMatchConfig {
  difficulty: number;
  pairCount: number;      // 配对数量 (4-10)
  timeLimit: number;      // 时间限制(秒)，0表示无限制
}

// 游戏状态
export interface SoundMatchState {
  phase: MatchPhase;
  cards: Card[];
  selectedCards: string[];  // 当前选中的卡片ID
  matchedPairs: number;
  attempts: number;         // 尝试次数
  startTime: number | null;
  isComplete: boolean;
}

// 结果
export interface SoundMatchResult {
  score: number;
  accuracy: number;
  duration: number;
  pairCount: number;
  matchedPairs: number;
  attempts: number;
  perfectMatches: number;   // 一次就配对成功的次数
}

/**
 * 根据难度获取配置
 */
export function getSoundMatchConfigFromDifficulty(difficulty: number): SoundMatchConfig {
  const d = Math.max(1, Math.min(10, difficulty));
  
  // 配对数量：4-10对
  const pairCount = Math.min(10, 3 + Math.ceil(d * 0.7));
  
  // 时间限制：简单无限制，困难有限制
  const timeLimit = d <= 3 ? 0 : d <= 6 ? 120 : d <= 8 ? 90 : 60;
  
  return {
    difficulty: d,
    pairCount,
    timeLimit,
  };
}

/**
 * 随机打乱数组
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
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * 创建卡片
 */
function createCards(pairCount: number): Card[] {
  // 选择声音
  const selectedSounds = shuffle([...SOUND_ITEMS]).slice(0, pairCount);
  
  // 每个声音创建两张卡片
  const cards: Card[] = [];
  selectedSounds.forEach((sound) => {
    cards.push({ id: generateId(), soundId: sound.id, state: 'hidden', position: 0 });
    cards.push({ id: generateId(), soundId: sound.id, state: 'hidden', position: 0 });
  });
  
  // 打乱并分配位置
  const shuffled = shuffle(cards);
  shuffled.forEach((card, index) => {
    card.position = index;
  });
  
  return shuffled;
}

/**
 * 创建初始状态
 */
export function createSoundMatchInitialState(config: SoundMatchConfig): SoundMatchState {
  return {
    phase: 'setup',
    cards: createCards(config.pairCount),
    selectedCards: [],
    matchedPairs: 0,
    attempts: 0,
    startTime: null,
    isComplete: false,
  };
}

/**
 * SoundMatchEngine 类
 */
export class SoundMatchEngine {
  private state: SoundMatchState;
  private config: SoundMatchConfig;
  private perfectMatches: number = 0;
  private currentPairAttempts: number = 0;

  constructor(config: SoundMatchConfig) {
    this.config = config;
    this.state = createSoundMatchInitialState(config);
  }

  getState(): SoundMatchState {
    return { ...this.state };
  }

  getConfig(): SoundMatchConfig {
    return { ...this.config };
  }

  getCards(): Card[] {
    return [...this.state.cards];
  }

  getSelectedCards(): string[] {
    return [...this.state.selectedCards];
  }

  getMatchedPairs(): number {
    return this.state.matchedPairs;
  }

  getTotalPairs(): number {
    return this.config.pairCount;
  }

  getAttempts(): number {
    return this.state.attempts;
  }

  getPhase(): MatchPhase {
    return this.state.phase;
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * 开始游戏
   */
  start(): void {
    if (this.state.phase === 'setup') {
      this.state.startTime = Date.now();
      this.state.phase = 'playing';
    }
  }

  /**
   * 获取卡片对应的声音
   */
  getCardSound(cardId: string): SoundItem | null {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return null;
    return SOUND_ITEMS.find(s => s.id === card.soundId) || null;
  }

  /**
   * 选择卡片
   */
  selectCard(cardId: string): { 
    success: boolean; 
    isMatch?: boolean; 
    matchedCardIds?: string[];
    sound?: SoundItem;
  } {
    if (this.state.phase !== 'playing') {
      return { success: false };
    }

    const card = this.state.cards.find(c => c.id === cardId);
    if (!card || card.state !== 'hidden') {
      return { success: false };
    }

    // 如果已经选了两张，不能再选
    if (this.state.selectedCards.length >= 2) {
      return { success: false };
    }

    // 翻开卡片
    card.state = 'revealed';
    this.state.selectedCards.push(cardId);

    const sound = SOUND_ITEMS.find(s => s.id === card.soundId);

    // 如果选了两张，检查是否匹配
    if (this.state.selectedCards.length === 2) {
      this.state.attempts++;
      this.currentPairAttempts++;
      
      const [firstId, secondId] = this.state.selectedCards;
      const firstCard = this.state.cards.find(c => c.id === firstId)!;
      const secondCard = this.state.cards.find(c => c.id === secondId)!;

      if (firstCard.soundId === secondCard.soundId) {
        // 匹配成功
        firstCard.state = 'matched';
        secondCard.state = 'matched';
        this.state.matchedPairs++;
        
        if (this.currentPairAttempts === 1) {
          this.perfectMatches++;
        }
        this.currentPairAttempts = 0;

        // 检查是否完成
        if (this.state.matchedPairs >= this.config.pairCount) {
          this.state.isComplete = true;
          this.state.phase = 'result';
        }

        return { 
          success: true, 
          isMatch: true, 
          matchedCardIds: [firstId, secondId],
          sound: sound || undefined,
        };
      }

      return { success: true, isMatch: false, sound: sound || undefined };
    }

    return { success: true, sound: sound || undefined };
  }

  /**
   * 重置选择（配对失败后调用）
   */
  resetSelection(): void {
    this.state.selectedCards.forEach(cardId => {
      const card = this.state.cards.find(c => c.id === cardId);
      if (card && card.state === 'revealed') {
        card.state = 'hidden';
      }
    });
    this.state.selectedCards = [];
  }

  /**
   * 清除选择状态（配对成功后调用）
   */
  clearSelection(): void {
    this.state.selectedCards = [];
  }

  /**
   * 计算结果
   */
  calculateResult(): SoundMatchResult {
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    // 准确率 = 配对数 / 尝试次数
    const accuracy = this.state.attempts > 0 
      ? this.state.matchedPairs / this.state.attempts 
      : 0;
    
    // 计算分数
    const baseScore = this.state.matchedPairs * 50;
    const perfectBonus = this.perfectMatches * 30;
    const efficiencyBonus = Math.max(0, 100 - this.state.attempts * 2);
    const speedBonus = Math.max(0, Math.round((300 - duration) / 3));
    const difficultyBonus = this.config.difficulty * 20;
    
    const score = baseScore + perfectBonus + efficiencyBonus + speedBonus + difficultyBonus;

    return {
      score: Math.max(0, Math.round(score)),
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 10) / 10,
      pairCount: this.config.pairCount,
      matchedPairs: this.state.matchedPairs,
      attempts: this.state.attempts,
      perfectMatches: this.perfectMatches,
    };
  }

  /**
   * 重置游戏
   */
  reset(): void {
    this.state = createSoundMatchInitialState(this.config);
    this.perfectMatches = 0;
    this.currentPairAttempts = 0;
  }
}

/**
 * 播放声音（使用 Web Speech API）
 */
export function playSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    
    // 取消之前的语音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.2;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
  });
}
