/**
 * PalaceEngine - 记忆宫殿训练引擎
 * 实现多房间记忆宫殿的核心逻辑
 */

// 物品定义
export const PALACE_ITEMS = [
  { id: 'apple', name: '苹果', icon: '🍎' },
  { id: 'key', name: '钥匙', icon: '🔑' },
  { id: 'book', name: '书本', icon: '📖' },
  { id: 'cup', name: '杯子', icon: '☕' },
  { id: 'clock', name: '时钟', icon: '⏰' },
  { id: 'flower', name: '花朵', icon: '🌸' },
  { id: 'lamp', name: '台灯', icon: '💡' },
  { id: 'phone', name: '手机', icon: '📱' },
  { id: 'glasses', name: '眼镜', icon: '👓' },
  { id: 'wallet', name: '钱包', icon: '👛' },
  { id: 'umbrella', name: '雨伞', icon: '☂️' },
  { id: 'camera', name: '相机', icon: '📷' },
  { id: 'hat', name: '帽子', icon: '🎩' },
  { id: 'shoe', name: '鞋子', icon: '👟' },
  { id: 'ball', name: '球', icon: '⚽' },
  { id: 'candle', name: '蜡烛', icon: '🕯️' },
] as const;

export type ItemId = typeof PALACE_ITEMS[number]['id'];

export interface PalaceItem {
  id: string;
  name: string;
  icon: string;
}

// 锚点定义
export interface Anchor {
  id: string;
  name: string;
  icon: string;
  x: number;  // 百分比 0-100
  y: number;
}

// 房间定义
export interface Room {
  id: string;
  name: string;
  icon: string;
  anchors: Anchor[];
  bgColor: string;
}

// 预设房间
export const ROOMS: Room[] = [
  {
    id: 'living',
    name: '客厅',
    icon: '🛋️',
    bgColor: 'from-amber-50 to-orange-50',
    anchors: [
      { id: 'sofa', name: '沙发', icon: '🛋️', x: 20, y: 50 },
      { id: 'tv', name: '电视柜', icon: '📺', x: 80, y: 50 },
      { id: 'table', name: '茶几', icon: '🪑', x: 50, y: 60 },
      { id: 'window', name: '窗台', icon: '🪟', x: 50, y: 15 },
      { id: 'shelf', name: '书架', icon: '📚', x: 85, y: 20 },
      { id: 'door', name: '门口', icon: '🚪', x: 15, y: 85 },
    ],
  },
  {
    id: 'kitchen',
    name: '厨房',
    icon: '🍳',
    bgColor: 'from-green-50 to-emerald-50',
    anchors: [
      { id: 'stove', name: '灶台', icon: '🍳', x: 50, y: 20 },
      { id: 'fridge', name: '冰箱', icon: '🧊', x: 85, y: 30 },
      { id: 'sink', name: '水槽', icon: '🚰', x: 20, y: 25 },
      { id: 'counter', name: '料理台', icon: '🔪', x: 50, y: 50 },
      { id: 'cabinet', name: '橱柜', icon: '🗄️', x: 15, y: 70 },
      { id: 'dining', name: '餐桌', icon: '🍽️', x: 75, y: 75 },
    ],
  },
  {
    id: 'study',
    name: '书房',
    icon: '📚',
    bgColor: 'from-blue-50 to-indigo-50',
    anchors: [
      { id: 'desk', name: '书桌', icon: '🖥️', x: 50, y: 30 },
      { id: 'bookshelf', name: '书柜', icon: '📚', x: 85, y: 50 },
      { id: 'chair', name: '椅子', icon: '🪑', x: 50, y: 55 },
      { id: 'plant', name: '盆栽', icon: '🪴', x: 15, y: 25 },
      { id: 'lamp', name: '落地灯', icon: '🪔', x: 20, y: 60 },
      { id: 'rug', name: '地毯', icon: '🟫', x: 50, y: 80 },
    ],
  },
  {
    id: 'bedroom',
    name: '卧室',
    icon: '🛏️',
    bgColor: 'from-purple-50 to-pink-50',
    anchors: [
      { id: 'bed', name: '床', icon: '🛏️', x: 50, y: 40 },
      { id: 'nightstand', name: '床头柜', icon: '🛏️', x: 20, y: 35 },
      { id: 'wardrobe', name: '衣柜', icon: '🚪', x: 85, y: 50 },
      { id: 'mirror', name: '镜子', icon: '🪞', x: 15, y: 70 },
      { id: 'window2', name: '窗户', icon: '🪟', x: 50, y: 10 },
      { id: 'carpet', name: '地毯', icon: '🟣', x: 70, y: 80 },
    ],
  },
];

// 放置记录
export interface Placement {
  visibleAnchorId: string;  // 显示用的锚点ID（包含房间前缀）
  anchorId: string;
  itemId: string;
  roomId: string;
}

// 游戏阶段
export type PalacePhase = 'setup' | 'study' | 'test' | 'result';

// 配置
export interface PalaceConfig {
  difficulty: number;
  roomCount: number;        // 房间数量 1-4
  itemsPerRoom: number;     // 每房间物品数 2-5
  studyTimePerRoom: number; // 每房间记忆时间(秒)
  distractorCount: number;  // 干扰物品数量
}

// 游戏状态
export interface PalaceState {
  phase: PalacePhase;
  rooms: Room[];
  correctPlacements: Placement[];   // 正确答案
  userPlacements: Placement[];      // 用户放置
  availableItems: PalaceItem[];     // 可用物品（含干扰项）
  currentRoomIndex: number;
  studyStartTime: number | null;
  testStartTime: number | null;
  isComplete: boolean;
}

// 结果
export interface PalaceResult {
  score: number;
  accuracy: number;
  duration: number;
  roomCount: number;
  totalItems: number;
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  roomResults: RoomResult[];
}

export interface RoomResult {
  roomId: string;
  roomName: string;
  correctCount: number;
  totalCount: number;
}


/**
 * 根据难度获取配置
 */
export function getPalaceConfigFromDifficulty(difficulty: number): PalaceConfig {
  const d = Math.max(1, Math.min(10, difficulty));
  
  // 房间数量：1-4
  const roomCount = d <= 3 ? 1 : d <= 5 ? 2 : d <= 7 ? 3 : 4;
  
  // 每房间物品：2-5
  const itemsPerRoom = Math.min(5, 2 + Math.floor((d - 1) / 2));
  
  // 记忆时间：12秒-5秒
  const studyTimePerRoom = Math.max(5, 12 - Math.floor((d - 1) * 0.8));
  
  // 干扰物品：0-4
  const distractorCount = d <= 2 ? 0 : Math.min(4, Math.floor((d - 2) / 2));
  
  return {
    difficulty: d,
    roomCount,
    itemsPerRoom,
    studyTimePerRoom,
    distractorCount,
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
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * 创建初始状态
 */
export function createPalaceInitialState(config: PalaceConfig): PalaceState {
  // 选择房间
  const selectedRooms = shuffle([...ROOMS]).slice(0, config.roomCount);
  
  // 为每个房间分配物品
  const allItems = shuffle([...PALACE_ITEMS]);
  const correctPlacements: Placement[] = [];
  let itemIndex = 0;
  
  for (const room of selectedRooms) {
    const roomAnchors = shuffle([...room.anchors]).slice(0, config.itemsPerRoom);
    
    for (const anchor of roomAnchors) {
      if (itemIndex < allItems.length) {
        correctPlacements.push({
          visibleAnchorId: `${room.id}-${anchor.id}`,
          anchorId: anchor.id,
          itemId: allItems[itemIndex].id,
          roomId: room.id,
        });
        itemIndex++;
      }
    }
  }
  
  // 准备可用物品列表（正确物品 + 干扰项）
  const correctItemIds = correctPlacements.map(p => p.itemId);
  const correctItems = PALACE_ITEMS.filter(item => correctItemIds.includes(item.id));
  
  // 添加干扰项
  const distractors = PALACE_ITEMS
    .filter(item => !correctItemIds.includes(item.id))
    .slice(0, config.distractorCount);
  
  const availableItems = shuffle([...correctItems, ...distractors].map(item => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
  })));
  
  return {
    phase: 'setup',
    rooms: selectedRooms,
    correctPlacements,
    userPlacements: [],
    availableItems,
    currentRoomIndex: 0,
    studyStartTime: null,
    testStartTime: null,
    isComplete: false,
  };
}

/**
 * PalaceEngine 类
 */
export class PalaceEngine {
  private state: PalaceState;
  private config: PalaceConfig;

  constructor(config: PalaceConfig) {
    this.config = config;
    this.state = createPalaceInitialState(config);
  }

  getState(): PalaceState {
    return { ...this.state };
  }

  getConfig(): PalaceConfig {
    return { ...this.config };
  }

  getRooms(): Room[] {
    return [...this.state.rooms];
  }

  getCurrentRoom(): Room | null {
    return this.state.rooms[this.state.currentRoomIndex] || null;
  }

  getCurrentRoomIndex(): number {
    return this.state.currentRoomIndex;
  }

  getRoomCount(): number {
    return this.state.rooms.length;
  }

  /**
   * 获取当前房间的正确放置（记忆阶段用）
   */
  getCurrentRoomPlacements(): Placement[] {
    const room = this.getCurrentRoom();
    if (!room) return [];
    return this.state.correctPlacements.filter(p => p.roomId === room.id);
  }

  /**
   * 获取所有正确放置
   */
  getCorrectPlacements(): Placement[] {
    return [...this.state.correctPlacements];
  }

  /**
   * 获取可用物品
   */
  getAvailableItems(): PalaceItem[] {
    return [...this.state.availableItems];
  }

  /**
   * 获取用户放置
   */
  getUserPlacements(): Placement[] {
    return [...this.state.userPlacements];
  }

  /**
   * 开始记忆阶段
   */
  startStudy(): void {
    if (this.state.phase === 'setup') {
      this.state.phase = 'study';
      this.state.studyStartTime = Date.now();
      this.state.currentRoomIndex = 0;
    }
  }

  /**
   * 进入下一个房间（记忆阶段）
   */
  nextStudyRoom(): boolean {
    if (this.state.phase !== 'study') return false;
    
    if (this.state.currentRoomIndex < this.state.rooms.length - 1) {
      this.state.currentRoomIndex++;
      return true;
    }
    return false;
  }

  /**
   * 开始测试阶段
   */
  startTest(): void {
    if (this.state.phase === 'study') {
      this.state.phase = 'test';
      this.state.testStartTime = Date.now();
      this.state.currentRoomIndex = 0;
    }
  }

  /**
   * 进入下一个房间（测试阶段）
   */
  nextTestRoom(): boolean {
    if (this.state.phase !== 'test') return false;
    
    if (this.state.currentRoomIndex < this.state.rooms.length - 1) {
      this.state.currentRoomIndex++;
      return true;
    }
    return false;
  }

  /**
   * 放置物品
   */
  placeItem(roomId: string, anchorId: string, itemId: string): void {
    if (this.state.phase !== 'test') return;
    
    // 移除该锚点上的旧物品
    this.state.userPlacements = this.state.userPlacements.filter(
      p => !(p.roomId === roomId && p.anchorId === anchorId)
    );
    
    // 移除该物品在其他位置的放置
    this.state.userPlacements = this.state.userPlacements.filter(
      p => p.itemId !== itemId
    );
    
    // 添加新放置
    this.state.userPlacements.push({
      visibleAnchorId: `${roomId}-${anchorId}`,
      anchorId,
      itemId,
      roomId,
    });
  }

  /**
   * 移除物品
   */
  removeItem(roomId: string, anchorId: string): PalaceItem | null {
    if (this.state.phase !== 'test') return null;
    
    const placement = this.state.userPlacements.find(
      p => p.roomId === roomId && p.anchorId === anchorId
    );
    
    if (placement) {
      this.state.userPlacements = this.state.userPlacements.filter(
        p => !(p.roomId === roomId && p.anchorId === anchorId)
      );
      const item = PALACE_ITEMS.find(i => i.id === placement.itemId);
      return item ? { id: item.id, name: item.name, icon: item.icon } : null;
    }
    return null;
  }

  /**
   * 获取锚点上的物品
   */
  getItemAtAnchor(roomId: string, anchorId: string): PalaceItem | null {
    const placement = this.state.userPlacements.find(
      p => p.roomId === roomId && p.anchorId === anchorId
    );
    if (!placement) return null;
    const item = PALACE_ITEMS.find(i => i.id === placement.itemId);
    return item ? { id: item.id, name: item.name, icon: item.icon } : null;
  }

  /**
   * 获取未放置的物品
   */
  getUnplacedItems(): PalaceItem[] {
    const placedItemIds = new Set(this.state.userPlacements.map(p => p.itemId));
    return this.state.availableItems.filter(item => !placedItemIds.has(item.id));
  }

  /**
   * 完成测试
   */
  complete(): void {
    if (this.state.phase === 'test') {
      this.state.phase = 'result';
      this.state.isComplete = true;
    }
  }

  /**
   * 计算结果
   */
  calculateResult(): PalaceResult {
    const correct = this.state.correctPlacements;
    const user = this.state.userPlacements;
    
    let correctCount = 0;
    let wrongCount = 0;
    const roomResults: RoomResult[] = [];
    
    for (const room of this.state.rooms) {
      const roomCorrect = correct.filter(p => p.roomId === room.id);
      const roomUser = user.filter(p => p.roomId === room.id);
      
      let roomCorrectCount = 0;
      
      for (const cp of roomCorrect) {
        const userPlacement = roomUser.find(
          up => up.anchorId === cp.anchorId && up.itemId === cp.itemId
        );
        if (userPlacement) {
          correctCount++;
          roomCorrectCount++;
        }
      }
      
      // 错误放置：放了但不对
      const wrongInRoom = roomUser.filter(up => {
        const correctForAnchor = roomCorrect.find(cp => cp.anchorId === up.anchorId);
        return !correctForAnchor || correctForAnchor.itemId !== up.itemId;
      }).length;
      wrongCount += wrongInRoom;
      
      roomResults.push({
        roomId: room.id,
        roomName: room.name,
        correctCount: roomCorrectCount,
        totalCount: roomCorrect.length,
      });
    }
    
    const totalItems = correct.length;
    const missedCount = totalItems - correctCount;
    const accuracy = totalItems > 0 ? correctCount / totalItems : 0;
    
    const duration = this.state.testStartTime
      ? (Date.now() - this.state.testStartTime) / 1000
      : 0;
    
    // 计算分数
    const baseScore = correctCount * 20;
    const difficultyBonus = this.config.difficulty * 10;
    const accuracyBonus = Math.round(accuracy * 100);
    const roomBonus = this.config.roomCount * 15;
    const score = Math.max(0, baseScore + difficultyBonus + accuracyBonus + roomBonus - wrongCount * 5);
    
    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 10) / 10,
      roomCount: this.state.rooms.length,
      totalItems,
      correctCount,
      wrongCount,
      missedCount,
      roomResults,
    };
  }

  getPhase(): PalacePhase {
    return this.state.phase;
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  reset(): void {
    this.state = createPalaceInitialState(this.config);
  }
}
