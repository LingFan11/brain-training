/**
 * SceneEngine - 情景联想记忆训练引擎
 * 实现情景记忆训练的核心逻辑：场景元素生成、测试问题生成、难度调节
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

// 元素类型定义
export const ELEMENT_TYPES = [
  'apple', 'banana', 'book', 'cup', 'key', 'phone', 'clock', 'lamp',
  'chair', 'ball', 'hat', 'shoe', 'pen', 'flower', 'star', 'heart'
] as const;
export type ElementType = typeof ELEMENT_TYPES[number];

// 元素类型中文名称映射
export const ELEMENT_NAME_MAP: Record<ElementType, string> = {
  apple: '苹果',
  banana: '香蕉',
  book: '书本',
  cup: '杯子',
  key: '钥匙',
  phone: '手机',
  clock: '时钟',
  lamp: '台灯',
  chair: '椅子',
  ball: '球',
  hat: '帽子',
  shoe: '鞋子',
  pen: '钢笔',
  flower: '花朵',
  star: '星星',
  heart: '爱心',
};

// 测试类型
export type TestType = 'item' | 'spatial' | 'both';

// 场景元素接口
export interface SceneElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
}

// 测试问题类型
export type QuestionType = 'item' | 'spatial';

// 测试问题接口
export interface SceneTestQuestion {
  id: string;
  type: QuestionType;
  question: string;
  correctAnswer: string;
  options: string[];
  relatedElementId: string;
}

// 配置接口
export interface SceneConfig {
  difficulty: number;       // 1-10
  elementCount: number;     // 元素数量
  studyTime: number;        // 学习时间(秒)
  testType: TestType;       // 测试类型
  questionCount?: number;   // 问题数量（可选，默认等于元素数量）
}

// 响应记录
export interface SceneResponse {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

// 训练阶段
export type ScenePhase = 'ready' | 'study' | 'test' | 'result';

// 状态接口
export interface SceneState {
  elements: SceneElement[];
  phase: ScenePhase;
  testQuestions: SceneTestQuestion[];
  currentQuestionIndex: number;
  responses: SceneResponse[];
  startTime: number | null;
  studyStartTime: number | null;
  testStartTime: number | null;
  isComplete: boolean;
}

// 结果接口
export interface SceneResult {
  score: number;
  accuracy: number;
  duration: number;
  elementCount: number;
  questionCount: number;
  correctCount: number;
  errorCount: number;
  itemAccuracy: number;
  spatialAccuracy: number;
  studyTime: number;
}


/**
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * 生成随机位置
 * 坐标范围在 0.1-0.9 之间，避免边缘
 */
function generateRandomPosition(): { x: number; y: number } {
  return {
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.8,
  };
}

/**
 * 检查两个位置是否太近
 */
function isTooClose(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
  minDistance: number = 0.15
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < minDistance;
}

/**
 * 生成单个场景元素
 */
export function generateElement(
  usedTypes: Set<ElementType>,
  existingPositions: { x: number; y: number }[]
): SceneElement {
  // 选择未使用的元素类型
  const availableTypes = ELEMENT_TYPES.filter(t => !usedTypes.has(t));
  const type = availableTypes.length > 0
    ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
    : ELEMENT_TYPES[Math.floor(Math.random() * ELEMENT_TYPES.length)];
  
  // 生成不与现有元素重叠的位置
  let position = generateRandomPosition();
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    let tooClose = false;
    for (const existingPos of existingPositions) {
      if (isTooClose(position, existingPos)) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) break;
    position = generateRandomPosition();
    attempts++;
  }
  
  return {
    id: generateId(),
    type,
    position,
  };
}

/**
 * 生成场景元素集合
 */
export function generateScene(elementCount: number): SceneElement[] {
  const normalizedCount = Math.max(1, Math.min(16, elementCount));
  const elements: SceneElement[] = [];
  const usedTypes = new Set<ElementType>();
  const positions: { x: number; y: number }[] = [];
  
  for (let i = 0; i < normalizedCount; i++) {
    const element = generateElement(usedTypes, positions);
    elements.push(element);
    usedTypes.add(element.type);
    positions.push(element.position);
  }
  
  return elements;
}

/**
 * 获取位置描述
 */
export function getPositionDescription(position: { x: number; y: number }): string {
  const xDesc = position.x < 0.33 ? '左' : position.x > 0.66 ? '右' : '中';
  const yDesc = position.y < 0.33 ? '上' : position.y > 0.66 ? '下' : '中';
  
  if (xDesc === '中' && yDesc === '中') return '中央';
  if (yDesc === '中') return xDesc + '侧';
  if (xDesc === '中') return yDesc + '方';
  return yDesc + xDesc;
}

/**
 * 生成物品测试问题（问某个位置有什么物品）
 */
function generateItemQuestion(
  element: SceneElement,
  allElements: SceneElement[]
): SceneTestQuestion {
  const posDesc = getPositionDescription(element.position);
  const correctAnswer = ELEMENT_NAME_MAP[element.type];
  
  // 生成干扰选项
  const otherTypes = ELEMENT_TYPES.filter(t => t !== element.type);
  const shuffled = [...otherTypes].sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3).map(t => ELEMENT_NAME_MAP[t]);
  
  // 混合正确答案和干扰项
  const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  
  return {
    id: generateId(),
    type: 'item',
    question: `场景${posDesc}位置有什么物品？`,
    correctAnswer,
    options,
    relatedElementId: element.id,
  };
}

/**
 * 生成空间测试问题（问某个物品在什么位置）
 */
function generateSpatialQuestion(
  element: SceneElement,
  allElements: SceneElement[]
): SceneTestQuestion {
  const elementName = ELEMENT_NAME_MAP[element.type];
  const correctAnswer = getPositionDescription(element.position);
  
  // 生成位置选项
  const allPositions = ['左上', '上方', '右上', '左侧', '中央', '右侧', '左下', '下方', '右下'];
  const distractors = allPositions
    .filter(p => p !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
  const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  
  return {
    id: generateId(),
    type: 'spatial',
    question: `${elementName}在场景的什么位置？`,
    correctAnswer,
    options,
    relatedElementId: element.id,
  };
}

/**
 * 生成测试问题
 */
export function generateTestQuestions(
  elements: SceneElement[],
  testType: TestType,
  questionCount?: number
): SceneTestQuestion[] {
  const questions: SceneTestQuestion[] = [];
  const count = questionCount ?? elements.length;
  
  // 根据测试类型决定问题分布
  let itemCount = 0;
  let spatialCount = 0;
  
  if (testType === 'item') {
    itemCount = count;
  } else if (testType === 'spatial') {
    spatialCount = count;
  } else {
    // both: 平均分配
    itemCount = Math.ceil(count / 2);
    spatialCount = count - itemCount;
  }
  
  // 随机选择元素生成问题
  const shuffledElements = [...elements].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < itemCount && i < shuffledElements.length; i++) {
    questions.push(generateItemQuestion(shuffledElements[i], elements));
  }
  
  for (let i = 0; i < spatialCount && i < shuffledElements.length; i++) {
    const elementIndex = (itemCount + i) % shuffledElements.length;
    questions.push(generateSpatialQuestion(shuffledElements[elementIndex], elements));
  }
  
  // 打乱问题顺序
  return questions.sort(() => Math.random() - 0.5);
}


/**
 * 创建初始状态
 */
export function createSceneInitialState(config: SceneConfig): SceneState {
  const elements = generateScene(config.elementCount);
  const questionCount = config.questionCount ?? config.elementCount;
  const testQuestions = generateTestQuestions(elements, config.testType, questionCount);
  
  return {
    elements,
    phase: 'ready',
    testQuestions,
    currentQuestionIndex: 0,
    responses: [],
    startTime: null,
    studyStartTime: null,
    testStartTime: null,
    isComplete: false,
  };
}

/**
 * 根据难度获取配置
 */
export function getSceneConfigFromDifficulty(difficulty: number): SceneConfig {
  const normalizedDifficulty = Math.max(1, Math.min(10, difficulty));
  
  // 元素数量：3-10个
  const elementCount = 3 + Math.floor((normalizedDifficulty - 1) * 0.78);
  
  // 学习时间：15秒-5秒（难度越高时间越短）
  const studyTime = Math.max(5, 15 - Math.floor((normalizedDifficulty - 1) * 1.1));
  
  // 测试类型：低难度只测物品，中等测空间，高难度两者都测
  let testType: TestType;
  if (normalizedDifficulty <= 3) {
    testType = 'item';
  } else if (normalizedDifficulty <= 6) {
    testType = 'spatial';
  } else {
    testType = 'both';
  }
  
  return {
    difficulty: normalizedDifficulty,
    elementCount,
    studyTime,
    testType,
  };
}

/**
 * 自适应难度调节
 */
export function adjustSceneDifficulty(
  currentConfig: SceneConfig,
  accuracy: number
): SceneConfig {
  const newConfig = { ...currentConfig };
  
  if (accuracy > 0.8) {
    // 高准确率：提升难度
    if (newConfig.studyTime > 5) {
      newConfig.studyTime -= 1;
    } else if (newConfig.elementCount < 10) {
      newConfig.elementCount += 1;
    }
    newConfig.difficulty = Math.min(10, newConfig.difficulty + 1);
  } else if (accuracy < 0.5) {
    // 低准确率：降低难度
    if (newConfig.elementCount > 3) {
      newConfig.elementCount -= 1;
    } else if (newConfig.studyTime < 15) {
      newConfig.studyTime += 1;
    }
    newConfig.difficulty = Math.max(1, newConfig.difficulty - 1);
  }
  
  return newConfig;
}

/**
 * SceneEngine 类 - 处理情景记忆训练的状态和逻辑
 */
export class SceneEngine {
  private state: SceneState;
  private config: SceneConfig;

  constructor(config: SceneConfig) {
    this.config = config;
    this.state = createSceneInitialState(config);
  }

  /**
   * 获取当前状态
   */
  getState(): SceneState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): SceneConfig {
    return { ...this.config };
  }

  /**
   * 开始学习阶段
   */
  startStudy(): void {
    if (this.state.phase === 'ready') {
      this.state.startTime = Date.now();
      this.state.studyStartTime = Date.now();
      this.state.phase = 'study';
    }
  }

  /**
   * 结束学习阶段，开始测试
   */
  startTest(): void {
    if (this.state.phase === 'study') {
      this.state.testStartTime = Date.now();
      this.state.phase = 'test';
    }
  }

  /**
   * 获取场景元素
   */
  getElements(): SceneElement[] {
    return [...this.state.elements];
  }

  /**
   * 获取当前问题
   */
  getCurrentQuestion(): SceneTestQuestion | null {
    if (this.state.phase !== 'test' || this.state.isComplete) {
      return null;
    }
    if (this.state.currentQuestionIndex >= this.state.testQuestions.length) {
      return null;
    }
    return this.state.testQuestions[this.state.currentQuestionIndex];
  }

  /**
   * 处理用户回答
   */
  respond(userAnswer: string): boolean {
    if (this.state.phase !== 'test' || this.state.isComplete) {
      return false;
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      return false;
    }

    const isCorrect = userAnswer === currentQuestion.correctAnswer;

    // 记录响应
    this.state.responses.push({
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timestamp: Date.now(),
    });

    // 移动到下一个问题
    this.state.currentQuestionIndex++;

    // 检查是否完成
    if (this.state.currentQuestionIndex >= this.state.testQuestions.length) {
      this.state.isComplete = true;
      this.state.phase = 'result';
    }

    return isCorrect;
  }

  /**
   * 重置训练
   */
  reset(): void {
    this.state = createSceneInitialState(this.config);
  }

  /**
   * 更新配置并重置
   */
  setConfig(config: Partial<SceneConfig>): void {
    this.config = { ...this.config, ...config };
    this.reset();
  }

  /**
   * 计算训练结果
   */
  calculateResult(): SceneResult {
    const responses = this.state.responses;
    const questions = this.state.testQuestions;
    
    // 统计正确和错误数
    const correctCount = responses.filter(r => r.isCorrect).length;
    const errorCount = responses.length - correctCount;
    
    // 计算准确率
    const accuracy = responses.length > 0 ? correctCount / responses.length : 0;
    
    // 分别计算物品和空间问题的准确率
    const itemResponses = responses.filter((r, i) => {
      const q = questions.find(q => q.id === r.questionId);
      return q?.type === 'item';
    });
    const spatialResponses = responses.filter((r, i) => {
      const q = questions.find(q => q.id === r.questionId);
      return q?.type === 'spatial';
    });
    
    const itemCorrect = itemResponses.filter(r => r.isCorrect).length;
    const spatialCorrect = spatialResponses.filter(r => r.isCorrect).length;
    
    const itemAccuracy = itemResponses.length > 0 
      ? itemCorrect / itemResponses.length 
      : 0;
    const spatialAccuracy = spatialResponses.length > 0 
      ? spatialCorrect / spatialResponses.length 
      : 0;
    
    // 计算总时长
    const duration = this.state.startTime
      ? (Date.now() - this.state.startTime) / 1000
      : 0;
    
    // 计算实际学习时间
    const studyTime = this.state.studyStartTime && this.state.testStartTime
      ? (this.state.testStartTime - this.state.studyStartTime) / 1000
      : this.config.studyTime;
    
    // 计算分数
    // 基础分 = 正确数 * 10 * 难度系数
    // 元素奖励 = 元素数量 * 5
    // 准确率奖励 = 准确率 * 100
    const difficultyMultiplier = 1 + (this.config.difficulty - 1) * 0.1;
    const baseScore = Math.round(correctCount * 10 * difficultyMultiplier);
    const elementBonus = this.config.elementCount * 5;
    const accuracyBonus = Math.round(accuracy * 100);
    const score = Math.max(0, baseScore + elementBonus + accuracyBonus);

    return {
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      elementCount: this.state.elements.length,
      questionCount: questions.length,
      correctCount,
      errorCount,
      itemAccuracy: Math.round(itemAccuracy * 100) / 100,
      spatialAccuracy: Math.round(spatialAccuracy * 100) / 100,
      studyTime: Math.round(studyTime * 100) / 100,
    };
  }

  /**
   * 检查训练是否完成
   */
  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * 获取当前阶段
   */
  getPhase(): ScenePhase {
    return this.state.phase;
  }

  /**
   * 获取当前进度
   */
  getProgress(): { current: number; total: number } {
    return {
      current: this.state.currentQuestionIndex,
      total: this.state.testQuestions.length,
    };
  }

  /**
   * 获取学习阶段剩余时间（秒）
   */
  getStudyRemainingTime(): number {
    if (this.state.phase !== 'study' || !this.state.studyStartTime) {
      return 0;
    }
    const elapsed = (Date.now() - this.state.studyStartTime) / 1000;
    return Math.max(0, this.config.studyTime - elapsed);
  }

  /**
   * 检查学习时间是否结束
   */
  isStudyTimeUp(): boolean {
    return this.getStudyRemainingTime() <= 0;
  }
}

/**
 * 验证场景元素是否有效
 */
export function validateElement(element: SceneElement): boolean {
  if (!element) return false;
  if (!element.id || typeof element.id !== 'string') return false;
  if (!ELEMENT_TYPES.includes(element.type)) return false;
  if (typeof element.position?.x !== 'number' || typeof element.position?.y !== 'number') return false;
  if (element.position.x < 0 || element.position.x > 1) return false;
  if (element.position.y < 0 || element.position.y > 1) return false;
  return true;
}

/**
 * 验证场景是否有效
 */
export function validateScene(elements: SceneElement[], expectedCount: number): boolean {
  if (!Array.isArray(elements)) return false;
  if (elements.length !== expectedCount) return false;
  for (const element of elements) {
    if (!validateElement(element)) return false;
  }
  return true;
}

/**
 * 验证测试问题是否有效
 */
export function validateTestQuestion(question: SceneTestQuestion): boolean {
  if (!question) return false;
  if (!question.id || typeof question.id !== 'string') return false;
  if (question.type !== 'item' && question.type !== 'spatial') return false;
  if (!question.question || typeof question.question !== 'string') return false;
  if (!question.correctAnswer || typeof question.correctAnswer !== 'string') return false;
  if (!Array.isArray(question.options) || question.options.length < 2) return false;
  if (!question.options.includes(question.correctAnswer)) return false;
  return true;
}

/**
 * 验证测试问题集是否有效
 */
export function validateTestQuestions(
  questions: SceneTestQuestion[],
  testType: TestType
): boolean {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  
  for (const question of questions) {
    if (!validateTestQuestion(question)) return false;
  }
  
  // 验证问题类型分布
  const itemQuestions = questions.filter(q => q.type === 'item');
  const spatialQuestions = questions.filter(q => q.type === 'spatial');
  
  if (testType === 'item' && spatialQuestions.length > 0) return false;
  if (testType === 'spatial' && itemQuestions.length > 0) return false;
  if (testType === 'both' && (itemQuestions.length === 0 || spatialQuestions.length === 0)) {
    // 如果是both类型但问题数量太少，可能只有一种类型
    if (questions.length >= 2) return false;
  }
  
  return true;
}
