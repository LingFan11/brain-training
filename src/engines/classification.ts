/**
 * ClassificationEngine - 规则导向分类逻辑训练引擎
 * 实现规则分类训练的核心逻辑：分类项生成、规则生成和切换、成绩计算
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

// 形状定义
export const SHAPES = ['circle', 'square', 'triangle'] as const;
export type Shape = typeof SHAPES[number];

// 颜色定义
export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type Color = typeof COLORS[number];

// 大小定义
export const SIZES = ['small', 'medium', 'large'] as const;
export type Size = typeof SIZES[number];

// 属性类型
export type AttributeType = 'shape' | 'color' | 'size';
export const ATTRIBUTE_TYPES: AttributeType[] = ['shape', 'color', 'size'];

// 分类项接口
export interface ClassificationItem {
  shape: Shape;
  color: Color;
  size: Size;
}

// 分类规则接口
export interface ClassificationRule {
  id: string;
  description: string;
  attributeCount: number;
  test: (item: ClassificationItem) => boolean;
}

// 配置接口
export interface ClassificationConfig {
  difficulty: number;           // 1-10
  attributeCount: number;       // 属性数量 (1-3)
  itemCount: number;            // 每轮分类项数量
  consecutiveToSwitch: number;  // 连续正确多少次切换规则
}

// 响应记录
export interface ClassificationResponse {
  item: ClassificationItem;
  userAnswer: boolean;
  correctAnswer: boolean;
  isCorrect: boolean;
  timestamp: number;
}

// 状态接口
export interface ClassificationState {
  currentRule: ClassificationRule;
  items: ClassificationItem[];
  currentIndex: number;
  responses: ClassificationResponse[];
  consecutiveCorrect: number;
  rulesDiscovered: number;
  ruleHistory: ClassificationRule[];
  startTime: number | null;
  isComplete: boolean;
}

// 结果接口
export interface ClassificationResult {
  score: number;
  accuracy: number;
  duration: number;
  rulesDiscovered: number;
  totalItems: number;
  correctCount: number;
  errorCount: number;
  avgConsecutiveCorrect: number;
}


/**
 * 生成随机分类项
 */
export function generateItem(): ClassificationItem {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = SIZES[Math.floor(Math.random() * SIZES.length)];
  
  return { shape, color, size };
}

/**
 * 生成多个分类项
 */
export function generateItems(count: number): ClassificationItem[] {
  const items: ClassificationItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push(generateItem());
  }
  return items;
}

/**
 * 验证分类项是否有效
 */
export function validateItem(item: ClassificationItem): boolean {
  if (!item) return false;
  if (!SHAPES.includes(item.shape)) return false;
  if (!COLORS.includes(item.color)) return false;
  if (!SIZES.includes(item.size)) return false;
  return true;
}

/**
 * 生成单属性规则
 */
function generateSingleAttributeRule(): ClassificationRule {
  const attributeType = ATTRIBUTE_TYPES[Math.floor(Math.random() * ATTRIBUTE_TYPES.length)];
  
  let targetValue: string;
  let description: string;
  let test: (item: ClassificationItem) => boolean;
  
  switch (attributeType) {
    case 'shape':
      targetValue = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      description = `形状是${getShapeName(targetValue as Shape)}`;
      test = (item) => item.shape === targetValue;
      break;
    case 'color':
      targetValue = COLORS[Math.floor(Math.random() * COLORS.length)];
      description = `颜色是${getColorName(targetValue as Color)}`;
      test = (item) => item.color === targetValue;
      break;
    case 'size':
      targetValue = SIZES[Math.floor(Math.random() * SIZES.length)];
      description = `大小是${getSizeName(targetValue as Size)}`;
      test = (item) => item.size === targetValue;
      break;
  }
  
  return {
    id: `${attributeType}-${targetValue}`,
    description: description!,
    attributeCount: 1,
    test: test!,
  };
}

/**
 * 生成双属性规则
 */
function generateDoubleAttributeRule(): ClassificationRule {
  // 随机选择两个不同的属性
  const shuffled = [...ATTRIBUTE_TYPES].sort(() => Math.random() - 0.5);
  const [attr1, attr2] = shuffled.slice(0, 2);
  
  let value1: string;
  let value2: string;
  
  // 获取第一个属性的值
  if (attr1 === 'shape') {
    value1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  } else if (attr1 === 'color') {
    value1 = COLORS[Math.floor(Math.random() * COLORS.length)];
  } else {
    value1 = SIZES[Math.floor(Math.random() * SIZES.length)];
  }
  
  // 获取第二个属性的值
  if (attr2 === 'shape') {
    value2 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  } else if (attr2 === 'color') {
    value2 = COLORS[Math.floor(Math.random() * COLORS.length)];
  } else {
    value2 = SIZES[Math.floor(Math.random() * SIZES.length)];
  }
  
  const description = `${getAttributeDescription(attr1, value1)}且${getAttributeDescription(attr2, value2)}`;
  
  const test = (item: ClassificationItem) => {
    const match1 = item[attr1] === value1;
    const match2 = item[attr2] === value2;
    return match1 && match2;
  };
  
  return {
    id: `${attr1}-${value1}-${attr2}-${value2}`,
    description,
    attributeCount: 2,
    test,
  };
}

/**
 * 生成三属性规则
 */
function generateTripleAttributeRule(): ClassificationRule {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = SIZES[Math.floor(Math.random() * SIZES.length)];
  
  const description = `${getShapeName(shape)}、${getColorName(color)}、${getSizeName(size)}`;
  
  const test = (item: ClassificationItem) => {
    return item.shape === shape && item.color === color && item.size === size;
  };
  
  return {
    id: `shape-${shape}-color-${color}-size-${size}`,
    description,
    attributeCount: 3,
    test,
  };
}


/**
 * 根据属性数量生成规则
 */
export function generateRule(attributeCount: number): ClassificationRule {
  const normalizedCount = Math.max(1, Math.min(3, attributeCount));
  
  switch (normalizedCount) {
    case 1:
      return generateSingleAttributeRule();
    case 2:
      return generateDoubleAttributeRule();
    case 3:
      return generateTripleAttributeRule();
    default:
      return generateSingleAttributeRule();
  }
}

/**
 * 生成一个与当前规则不同的新规则
 */
export function generateDifferentRule(currentRule: ClassificationRule, attributeCount: number): ClassificationRule {
  let newRule: ClassificationRule;
  let attempts = 0;
  const maxAttempts = 20;
  
  do {
    newRule = generateRule(attributeCount);
    attempts++;
  } while (newRule.id === currentRule.id && attempts < maxAttempts);
  
  return newRule;
}

/**
 * 获取形状的中文名称
 */
export function getShapeName(shape: Shape): string {
  const names: Record<Shape, string> = {
    circle: '圆形',
    square: '方形',
    triangle: '三角形',
  };
  return names[shape];
}

/**
 * 获取颜色的中文名称
 */
export function getColorName(color: Color): string {
  const names: Record<Color, string> = {
    red: '红色',
    blue: '蓝色',
    green: '绿色',
    yellow: '黄色',
  };
  return names[color];
}

/**
 * 获取大小的中文名称
 */
export function getSizeName(size: Size): string {
  const names: Record<Size, string> = {
    small: '小',
    medium: '中',
    large: '大',
  };
  return names[size];
}

/**
 * 获取属性描述
 */
function getAttributeDescription(attr: AttributeType, value: string): string {
  switch (attr) {
    case 'shape':
      return `形状是${getShapeName(value as Shape)}`;
    case 'color':
      return `颜色是${getColorName(value as Color)}`;
    case 'size':
      return `大小是${getSizeName(value as Size)}`;
  }
}

/**
 * 根据难度获取属性数量
 */
export function getAttributeCountFromDifficulty(difficulty: number): number {
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  if (normalizedDifficulty <= 3) {
    return 1; // 简单：单属性规则
  } else if (normalizedDifficulty <= 6) {
    return 2; // 中等：双属性规则
  } else {
    return 3; // 困难：三属性规则
  }
}

/**
 * 根据难度获取配置
 */
export function getConfigFromDifficulty(difficulty: number): ClassificationConfig {
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  const attributeCount = getAttributeCountFromDifficulty(normalizedDifficulty);
  
  // 难度越高，需要更多连续正确才能切换规则
  const consecutiveToSwitch = 3 + Math.floor((normalizedDifficulty - 1) / 3);
  
  // 难度越高，分类项越多
  const itemCount = 15 + Math.floor((normalizedDifficulty - 1) * 2);
  
  return {
    difficulty: normalizedDifficulty,
    attributeCount,
    itemCount,
    consecutiveToSwitch,
  };
}


/**
 * 创建初始状态
 */
export function createInitialState(config: ClassificationConfig): ClassificationState {
  const rule = generateRule(config.attributeCount);
  
  return {
    currentRule: rule,
    items: generateItems(config.itemCount),
    currentIndex: 0,
    responses: [],
    consecutiveCorrect: 0,
    rulesDiscovered: 1, // 初始规则算作已发现
    ruleHistory: [rule],
    startTime: null,
    isComplete: false,
  };
}

/**
 * ClassificationEngine 类 - 处理规则分类训练的状态和逻辑
 */
export class ClassificationEngine {
  private state: ClassificationState;
  private config: ClassificationConfig;

  constructor(config: ClassificationConfig) {
    this.config = config;
    this.state = createInitialState(config);
  }

  /**
   * 获取当前状态
   */
  getState(): ClassificationState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): ClassificationConfig {
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
   * 获取当前分类项
   */
  getCurrentItem(): ClassificationItem | null {
    if (this.state.isComplete || this.state.currentIndex >= this.state.items.length) {
      return null;
    }
    return this.state.items[this.state.currentIndex];
  }

  /**
   * 获取当前规则（用于调试/测试，实际游戏中应隐藏）
   */
  getCurrentRule(): ClassificationRule {
    return this.state.currentRule;
  }

  /**
   * 处理用户分类响应
   * @param userAnswer 用户认为该项是否符合规则
   * @returns 用户答案是否正确
   */
  respond(userAnswer: boolean): boolean {
    // 如果训练已完成，忽略响应
    if (this.state.isComplete) {
      return false;
    }

    // 如果还没开始，自动开始
    if (this.state.startTime === null) {
      this.start();
    }

    const currentItem = this.getCurrentItem();
    if (!currentItem) {
      return false;
    }

    const correctAnswer = this.state.currentRule.test(currentItem);
    const isCorrect = userAnswer === correctAnswer;

    // 记录响应
    this.state.responses.push({
      item: currentItem,
      userAnswer,
      correctAnswer,
      isCorrect,
      timestamp: Date.now(),
    });

    // 更新连续正确计数
    if (isCorrect) {
      this.state.consecutiveCorrect++;
      
      // 检查是否需要切换规则
      if (this.state.consecutiveCorrect >= this.config.consecutiveToSwitch) {
        this.switchRule();
      }
    } else {
      this.state.consecutiveCorrect = 0;
    }

    // 移动到下一个分类项
    this.state.currentIndex++;

    // 检查是否完成
    if (this.state.currentIndex >= this.state.items.length) {
      this.state.isComplete = true;
    }

    return isCorrect;
  }

  /**
   * 切换到新规则
   */
  private switchRule(): void {
    const newRule = generateDifferentRule(this.state.currentRule, this.config.attributeCount);
    this.state.currentRule = newRule;
    this.state.ruleHistory.push(newRule);
    this.state.rulesDiscovered++;
    this.state.consecutiveCorrect = 0;
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
  setConfig(config: Partial<ClassificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }

  /**
   * 计算训练结果
   */
  calculateResult(): ClassificationResult {
    const totalItems = this.state.responses.length;
    const correctCount = this.state.responses.filter(r => r.isCorrect).length;
    const errorCount = totalItems - correctCount;

    // 计算总时长
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;

    // 计算准确率
    const accuracy = totalItems > 0 ? correctCount / totalItems : 0;

    // 计算平均连续正确数
    let totalConsecutive = 0;
    let consecutiveCount = 0;
    let currentStreak = 0;
    
    for (const response of this.state.responses) {
      if (response.isCorrect) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          totalConsecutive += currentStreak;
          consecutiveCount++;
        }
        currentStreak = 0;
      }
    }
    // 处理最后一个连续序列
    if (currentStreak > 0) {
      totalConsecutive += currentStreak;
      consecutiveCount++;
    }
    
    const avgConsecutiveCorrect = consecutiveCount > 0 
      ? totalConsecutive / consecutiveCount 
      : 0;

    // 计算分数
    // 基础分 = 正确数 * 10
    // 规则发现奖励 = 发现规则数 * 50
    // 准确率奖励 = 准确率 * 100
    const baseScore = correctCount * 10;
    const ruleBonus = this.state.rulesDiscovered * 50;
    const accuracyBonus = Math.round(accuracy * 100);
    const score = Math.max(0, baseScore + ruleBonus + accuracyBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      rulesDiscovered: this.state.rulesDiscovered,
      totalItems,
      correctCount,
      errorCount,
      avgConsecutiveCorrect: Math.round(avgConsecutiveCorrect * 100) / 100,
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
      total: this.state.items.length,
    };
  }

  /**
   * 获取规则历史
   */
  getRuleHistory(): ClassificationRule[] {
    return [...this.state.ruleHistory];
  }

  /**
   * 获取连续正确计数
   */
  getConsecutiveCorrect(): number {
    return this.state.consecutiveCorrect;
  }

  /**
   * 获取已发现规则数
   */
  getRulesDiscovered(): number {
    return this.state.rulesDiscovered;
  }
}

/**
 * 验证规则是否确定性的（对同一项多次应用返回相同结果）
 */
export function validateRuleDeterminism(rule: ClassificationRule, item: ClassificationItem): boolean {
  const result1 = rule.test(item);
  const result2 = rule.test(item);
  const result3 = rule.test(item);
  return result1 === result2 && result2 === result3;
}

/**
 * 验证规则是否有效
 */
export function validateRule(rule: ClassificationRule): boolean {
  if (!rule) return false;
  if (!rule.id || typeof rule.id !== 'string') return false;
  if (!rule.description || typeof rule.description !== 'string') return false;
  if (typeof rule.attributeCount !== 'number' || rule.attributeCount < 1 || rule.attributeCount > 3) return false;
  if (typeof rule.test !== 'function') return false;
  return true;
}
