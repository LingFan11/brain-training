/**
 * SoundMatchEngine - 声音配对记忆训练引擎
 * 翻牌配对游戏，用听觉代替视觉
 */

// 声音定义 - 使用 Web Speech API 的中文词语模拟不同声音
export const SOUND_ITEMS = [
  // 动物叫声
  { id: 'dog', name: '狗', icon: '🐕', speech: '汪汪汪' },
  { id: 'cat', name: '猫', icon: '🐱', speech: '喵喵喵' },
  { id: 'bird', name: '鸟', icon: '🐦', speech: '叽叽喳喳' },
  { id: 'cow', name: '牛', icon: '🐮', speech: '哞哞哞' },
  { id: 'frog', name: '蛙', icon: '🐸', speech: '呱呱呱' },
  { id: 'sheep', name: '羊', icon: '🐑', speech: '咩咩咩' },
  // 网络热梗
  { id: 'kun', name: '坤', icon: '🏀', speech: '哎呦你干嘛' },
  { id: 'ouch', name: '哎呦', icon: '😫', speech: '哎呦' },
  { id: 'niubi', name: '牛啊', icon: '🐂', speech: '牛逼' },
  { id: 'wocao', name: '卧槽', icon: '😱', speech: '卧槽' },
  { id: 'yyds', name: 'YYDS', icon: '🏆', speech: '永远的神' },
  { id: 'jinitaimei', name: '太美', icon: '✨', speech: '鸡你太美' },
  { id: 'awsl', name: 'AWSL', icon: '😍', speech: '啊我死了' },
  { id: 'xswl', name: 'XSWL', icon: '🤣', speech: '笑死我了' },
  { id: 'emm', name: 'EMM', icon: '🤔', speech: '额嗯嗯嗯' },
  { id: 'gg', name: 'GG', icon: '💀', speech: '寄了寄了' },
  { id: 'nb', name: '666', icon: '👍', speech: '六六六' },
  { id: 'tql', name: 'TQL', icon: '🔥', speech: '太强了' },
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
  pairCount: number;
  timeLimit: number;
}

// 游戏状态
export interface SoundMatchState {
  phase: MatchPhase;
  cards: Card[];
  selectedCards: string[];
  matchedPairs: number;
  attempts: number;
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
  perfectMatches: number;
}

export function getSoundMatchConfigFromDifficulty(difficulty: number): SoundMatchConfig {
  const d = Math.max(1, Math.min(10, difficulty));
  const pairCount = Math.min(10, 3 + Math.ceil(d * 0.7));
  const timeLimit = d <= 3 ? 0 : d <= 6 ? 120 : d <= 8 ? 90 : 60;
  return { difficulty: d, pairCount, timeLimit };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createCards(pairCount: number): Card[] {
  const selectedSounds = shuffle([...SOUND_ITEMS]).slice(0, pairCount);
  const cards: Card[] = [];
  selectedSounds.forEach((sound) => {
    cards.push({ id: generateId(), soundId: sound.id, state: 'hidden', position: 0 });
    cards.push({ id: generateId(), soundId: sound.id, state: 'hidden', position: 0 });
  });
  const shuffled = shuffle(cards);
  shuffled.forEach((card, index) => { card.position = index; });
  return shuffled;
}

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


export class SoundMatchEngine {
  private state: SoundMatchState;
  private config: SoundMatchConfig;
  private perfectMatches: number = 0;
  private currentPairAttempts: number = 0;

  constructor(config: SoundMatchConfig) {
    this.config = config;
    this.state = createSoundMatchInitialState(config);
  }

  getState(): SoundMatchState { return { ...this.state }; }
  getConfig(): SoundMatchConfig { return { ...this.config }; }
  getCards(): Card[] { return [...this.state.cards]; }
  getSelectedCards(): string[] { return [...this.state.selectedCards]; }
  getMatchedPairs(): number { return this.state.matchedPairs; }
  getTotalPairs(): number { return this.config.pairCount; }
  getAttempts(): number { return this.state.attempts; }
  getPhase(): MatchPhase { return this.state.phase; }
  isComplete(): boolean { return this.state.isComplete; }

  start(): void {
    if (this.state.phase === 'setup') {
      this.state.startTime = Date.now();
      this.state.phase = 'playing';
    }
  }

  getCardSound(cardId: string): SoundItem | null {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return null;
    const item = SOUND_ITEMS.find(s => s.id === card.soundId);
    return item ? { id: item.id, name: item.name, icon: item.icon, speech: item.speech } : null;
  }

  selectCard(cardId: string): { success: boolean; isMatch?: boolean; matchedCardIds?: string[]; sound?: SoundItem } {
    if (this.state.phase !== 'playing') return { success: false };
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card || card.state !== 'hidden') return { success: false };
    if (this.state.selectedCards.length >= 2) return { success: false };

    card.state = 'revealed';
    this.state.selectedCards.push(cardId);
    const item = SOUND_ITEMS.find(s => s.id === card.soundId);
    const sound = item ? { id: item.id, name: item.name, icon: item.icon, speech: item.speech } : undefined;

    if (this.state.selectedCards.length === 2) {
      this.state.attempts++;
      this.currentPairAttempts++;
      const [firstId, secondId] = this.state.selectedCards;
      const firstCard = this.state.cards.find(c => c.id === firstId)!;
      const secondCard = this.state.cards.find(c => c.id === secondId)!;

      if (firstCard.soundId === secondCard.soundId) {
        firstCard.state = 'matched';
        secondCard.state = 'matched';
        this.state.matchedPairs++;
        if (this.currentPairAttempts === 1) this.perfectMatches++;
        this.currentPairAttempts = 0;
        if (this.state.matchedPairs >= this.config.pairCount) {
          this.state.isComplete = true;
          this.state.phase = 'result';
        }
        return { success: true, isMatch: true, matchedCardIds: [firstId, secondId], sound };
      }
      return { success: true, isMatch: false, sound };
    }
    return { success: true, sound };
  }

  resetSelection(): void {
    this.state.selectedCards.forEach(cardId => {
      const card = this.state.cards.find(c => c.id === cardId);
      if (card && card.state === 'revealed') card.state = 'hidden';
    });
    this.state.selectedCards = [];
  }

  clearSelection(): void { this.state.selectedCards = []; }

  calculateResult(): SoundMatchResult {
    const duration = this.state.startTime ? (Date.now() - this.state.startTime) / 1000 : 0;
    const accuracy = this.state.attempts > 0 ? this.state.matchedPairs / this.state.attempts : 0;
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

  reset(): void {
    this.state = createSoundMatchInitialState(this.config);
    this.perfectMatches = 0;
    this.currentPairAttempts = 0;
  }
}

export function playSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return; }
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
