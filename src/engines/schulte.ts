/**
 * SchulteEngine - 舒尔特表训练引擎
 * 实现舒尔特表的核心逻辑：网格生成、点击处理、成绩计算
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

export type GridSize = 3 | 4 | 5 | 6;

export interface SchulteConfig {
  gridSize: GridSize;
  difficulty?: number; // 1-10, 默认基于 gridSize
}

export interface SchulteState {
  grid: number[][];
  currentTarget: number;
  correctCount: number;
  errorCount: number;
  startTime: number | null;
  endTime: number | null;
  isComplete: boolean;
  tapHistory: TapRecord[];
}

export interface TapRecord {
  number: number;
  timestamp: number;
  isCorrect: boolean;
}

export interface SchulteResult {
  score: number;
  accuracy: number;
  duration: number;
  gridSize: GridSize;
  correctCount: number;
  errorCount: number;
  totalTaps: number;
  avgTapTime: number;
}

/**
 * 生成随机舒尔特表网格
 * 网格包含 1 到 n² 的所有数字，随机排列
 */
export function generateGrid(size: GridSize): number[][] {
  const totalNumbers = size * size;
  
  // 生成 1 到 n² 的数字数组
  const numbers: number[] = [];
  for (let i = 1; i <= totalNumbers; i++) {
    numbers.push(i);
  }
  
  // Fisher-Yates 洗牌算法
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // 转换为二维网格
  const grid: number[][] = [];
  for (let row = 0; row < size; row++) {
    grid.push(numbers.slice(row * size, (row + 1) * size));
  }
  
  return grid;
}

/**
 * 创建初始状态
 */
export function createInitialState(config: SchulteConfig): SchulteState {
  return {
    grid: generateGrid(config.gridSize),
    currentTarget: 1,
    correctCount: 0,
    errorCount: 0,
    startTime: null,
    endTime: null,
    isComplete: false,
    tapHistory: [],
  };
}

/**
 * SchulteEngine 类 - 处理舒尔特表训练的状态和逻辑
 */
export class SchulteEngine {
  private state: SchulteState;
  private config: SchulteConfig;

  constructor(config: SchulteConfig) {
    this.config = config;
    this.state = createInitialState(config);
  }

  /**
   * 获取当前状态
   */
  getState(): SchulteState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): SchulteConfig {
    return { ...this.config };
  }

  /**
   * 开始训练
   */
  start(): void {
    if (this.state.startTime === null) {
      this.state.startTime = Date.now();
    }
  }

  /**
   * 处理数字点击
   * 返回点击是否正确
   */
  tap(number: number): boolean {
    // 如果训练已完成，忽略点击
    if (this.state.isComplete) {
      return false;
    }

    // 如果还没开始，自动开始
    if (this.state.startTime === null) {
      this.start();
    }

    const isCorrect = number === this.state.currentTarget;
    const timestamp = Date.now();

    // 记录点击历史
    this.state.tapHistory.push({
      number,
      timestamp,
      isCorrect,
    });

    if (isCorrect) {
      this.state.correctCount++;
      this.state.currentTarget++;

      // 检查是否完成
      const totalNumbers = this.config.gridSize * this.config.gridSize;
      if (this.state.currentTarget > totalNumbers) {
        this.state.isComplete = true;
        this.state.endTime = timestamp;
      }
    } else {
      this.state.errorCount++;
    }

    return isCorrect;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createInitialState(this.config);
  }

  /**
   * 更改网格大小并重置
   */
  setGridSize(size: GridSize): void {
    this.config.gridSize = size;
    this.reset();
  }

  /**
   * 计算训练结果
   */
  calculateResult(): SchulteResult {
    const totalTaps = this.state.correctCount + this.state.errorCount;
    const duration = this.state.endTime && this.state.startTime
      ? (this.state.endTime - this.state.startTime) / 1000
      : 0;

    // 计算准确率
    const accuracy = totalTaps > 0 
      ? this.state.correctCount / totalTaps 
      : 0;

    // 计算平均点击时间（仅计算正确点击）
    const correctTaps = this.state.tapHistory.filter(t => t.isCorrect);
    let avgTapTime = 0;
    if (correctTaps.length > 1) {
      let totalTime = 0;
      for (let i = 1; i < correctTaps.length; i++) {
        totalTime += correctTaps[i].timestamp - correctTaps[i - 1].timestamp;
      }
      avgTapTime = totalTime / (correctTaps.length - 1) / 1000; // 转换为秒
    }

    // 计算分数
    // 基础分 = 网格大小 * 100
    // 时间奖励 = 基于完成时间的奖励
    // 准确率惩罚 = 错误次数 * 10
    const baseScore = this.config.gridSize * 100;
    const timeBonus = Math.max(0, Math.round((60 - duration) * 2)); // 60秒内完成有奖励
    const errorPenalty = this.state.errorCount * 10;
    const score = Math.max(0, baseScore + timeBonus - errorPenalty);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      gridSize: this.config.gridSize,
      correctCount: this.state.correctCount,
      errorCount: this.state.errorCount,
      totalTaps,
      avgTapTime: Math.round(avgTapTime * 1000) / 1000,
    };
  }

  /**
   * 检查训练是否完成
   */
  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * 获取当前目标数字
   */
  getCurrentTarget(): number {
    return this.state.currentTarget;
  }

  /**
   * 获取网格
   */
  getGrid(): number[][] {
    return this.state.grid.map(row => [...row]);
  }
}

/**
 * 根据网格大小获取默认难度
 */
export function getDifficultyFromGridSize(size: GridSize): number {
  const difficultyMap: Record<GridSize, number> = {
    3: 2,
    4: 4,
    5: 6,
    6: 8,
  };
  return difficultyMap[size];
}

/**
 * 验证网格是否有效
 * 用于测试：检查网格是否包含所有必需的数字且无重复
 */
export function validateGrid(grid: number[][], size: GridSize): boolean {
  const totalNumbers = size * size;
  const flatGrid = grid.flat();
  
  // 检查数量
  if (flatGrid.length !== totalNumbers) {
    return false;
  }
  
  // 检查是否包含 1 到 n² 的所有数字
  const sortedNumbers = [...flatGrid].sort((a, b) => a - b);
  for (let i = 0; i < totalNumbers; i++) {
    if (sortedNumbers[i] !== i + 1) {
      return false;
    }
  }
  
  return true;
}
