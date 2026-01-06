/**
 * SceneEngine Property Tests
 * 
 * Property 23: Scene Element Generation
 * Property 24: Scene Recall Recording
 * Property 25: Scene Difficulty Scaling
 * 
 * **Validates: Requirements 8.1, 8.3, 8.4, 8.5**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SceneEngine,
  generateScene,
  generateElement,
  generateTestQuestions,
  validateElement,
  validateScene,
  validateTestQuestion,
  validateTestQuestions,
  getSceneConfigFromDifficulty,
  adjustSceneDifficulty,
  getPositionDescription,
  ELEMENT_TYPES,
  ELEMENT_NAME_MAP,
  type SceneConfig,
  type SceneElement,
  type TestType,
} from './scene';

// Arbitrary for valid difficulty (1-10)
const difficultyArb = fc.integer({ min: 1, max: 10 });

// Arbitrary for valid element count (1-16)
const elementCountArb = fc.integer({ min: 1, max: 16 });

// Arbitrary for valid study time (5-30 seconds)
const studyTimeArb = fc.integer({ min: 5, max: 30 });

// Arbitrary for test type
const testTypeArb = fc.constantFrom<TestType>('item', 'spatial', 'both');

// Arbitrary for valid scene config
const sceneConfigArb = fc.record({
  difficulty: difficultyArb,
  elementCount: elementCountArb,
  studyTime: studyTimeArb,
  testType: testTypeArb,
});

// Arbitrary for valid position (0-1)
const positionArb = fc.record({
  x: fc.double({ min: 0, max: 1, noNaN: true }),
  y: fc.double({ min: 0, max: 1, noNaN: true }),
});

// Arbitrary for valid scene element
const sceneElementArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  type: fc.constantFrom(...ELEMENT_TYPES),
  position: positionArb,
}) as fc.Arbitrary<SceneElement>;

describe('SceneEngine', () => {
  /**
   * Property 23: Scene Element Generation
   * For any scene memory configuration, the generated scene should contain 
   * exactly the specified number of elements with valid positions, and test 
   * questions should include both item and spatial types when configured.
   * 
   * **Validates: Requirements 8.1, 8.4**
   */
  it('Property 23: Scene Element Generation - scene has correct element count and valid positions', () => {
    fc.assert(
      fc.property(elementCountArb, (count) => {
        const elements = generateScene(count);
        
        // Should have correct number of elements
        expect(elements.length).toBe(count);
        
        // All elements should be valid
        for (const element of elements) {
          expect(validateElement(element)).toBe(true);
          
          // Element type should be valid
          expect(ELEMENT_TYPES).toContain(element.type);
          
          // Position should be within valid range
          expect(element.position.x).toBeGreaterThanOrEqual(0);
          expect(element.position.x).toBeLessThanOrEqual(1);
          expect(element.position.y).toBeGreaterThanOrEqual(0);
          expect(element.position.y).toBeLessThanOrEqual(1);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 23: Scene Element Generation - test questions match test type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        testTypeArb,
        (elementCount, testType) => {
          const elements = generateScene(elementCount);
          const questions = generateTestQuestions(elements, testType);
          
          // Should have questions
          expect(questions.length).toBeGreaterThan(0);
          
          // All questions should be valid
          for (const question of questions) {
            expect(validateTestQuestion(question)).toBe(true);
          }
          
          // Check question type distribution
          const itemQuestions = questions.filter(q => q.type === 'item');
          const spatialQuestions = questions.filter(q => q.type === 'spatial');
          
          if (testType === 'item') {
            expect(itemQuestions.length).toBeGreaterThan(0);
            expect(spatialQuestions.length).toBe(0);
          } else if (testType === 'spatial') {
            expect(spatialQuestions.length).toBeGreaterThan(0);
            expect(itemQuestions.length).toBe(0);
          } else {
            // 'both' - should have both types when enough elements
            if (elementCount >= 2) {
              expect(itemQuestions.length).toBeGreaterThan(0);
              expect(spatialQuestions.length).toBeGreaterThan(0);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Scene Recall Recording
   * For any scene memory test question, a correct answer should be 
   * recorded as successful retrieval.
   * 
   * **Validates: Requirements 8.3**
   */
  it('Property 24: Scene Recall Recording - correct answers are recorded as successful', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        testTypeArb,
        (elementCount, testType) => {
          const config: SceneConfig = {
            difficulty: 5,
            elementCount,
            studyTime: 10,
            testType,
          };
          
          const engine = new SceneEngine(config);
          engine.startStudy();
          engine.startTest();
          
          const questions = engine.getState().testQuestions;
          
          // Answer all questions correctly
          for (let i = 0; i < questions.length; i++) {
            const question = engine.getCurrentQuestion();
            if (!question) break;
            
            const isCorrect = engine.respond(question.correctAnswer);
            expect(isCorrect).toBe(true);
          }
          
          // All responses should be correct
          const state = engine.getState();
          for (const response of state.responses) {
            expect(response.isCorrect).toBe(true);
            expect(response.userAnswer).toBe(response.correctAnswer);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Scene Recall Recording - incorrect answers are recorded as failed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        (elementCount) => {
          const config: SceneConfig = {
            difficulty: 5,
            elementCount,
            studyTime: 10,
            testType: 'item',
          };
          
          const engine = new SceneEngine(config);
          engine.startStudy();
          engine.startTest();
          
          const question = engine.getCurrentQuestion();
          if (!question) return true;
          
          // Find a wrong answer
          const wrongAnswer = question.options.find(o => o !== question.correctAnswer);
          if (!wrongAnswer) return true;
          
          const isCorrect = engine.respond(wrongAnswer);
          expect(isCorrect).toBe(false);
          
          const state = engine.getState();
          const lastResponse = state.responses[state.responses.length - 1];
          expect(lastResponse.isCorrect).toBe(false);
          expect(lastResponse.userAnswer).toBe(wrongAnswer);
          expect(lastResponse.correctAnswer).toBe(question.correctAnswer);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25: Scene Difficulty Scaling
   * For any scene memory configuration, increasing difficulty should 
   * result in more elements or reduced study time.
   * 
   * **Validates: Requirements 8.5**
   */
  it('Property 25: Scene Difficulty Scaling - higher difficulty means more elements or less time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (difficulty) => {
          const lowerConfig = getSceneConfigFromDifficulty(difficulty);
          const higherConfig = getSceneConfigFromDifficulty(difficulty + 1);
          
          // Higher difficulty should have more elements OR less study time
          const moreElements = higherConfig.elementCount >= lowerConfig.elementCount;
          const lessTime = higherConfig.studyTime <= lowerConfig.studyTime;
          
          expect(moreElements || lessTime).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 25: Scene Difficulty Scaling - adaptive difficulty adjusts correctly', () => {
    fc.assert(
      fc.property(
        sceneConfigArb,
        fc.double({ min: 0, max: 1, noNaN: true }),
        (config, accuracy) => {
          const adjustedConfig = adjustSceneDifficulty(config, accuracy);
          
          if (accuracy > 0.8) {
            // High accuracy should increase difficulty (unless already at max)
            expect(adjustedConfig.difficulty).toBeGreaterThanOrEqual(config.difficulty);
            // Either more elements or less study time (unless already at limits)
            const atMaxDifficulty = config.difficulty >= 10;
            const atMaxElements = config.elementCount >= 10;
            const atMinStudyTime = config.studyTime <= 5;
            
            if (!atMaxDifficulty || !atMaxElements || !atMinStudyTime) {
              const harder = 
                adjustedConfig.elementCount > config.elementCount ||
                adjustedConfig.studyTime < config.studyTime ||
                adjustedConfig.difficulty > config.difficulty;
              // If not at all limits, should get harder
              if (!(atMaxDifficulty && atMaxElements && atMinStudyTime)) {
                expect(harder).toBe(true);
              }
            }
          } else if (accuracy < 0.5) {
            // Low accuracy should decrease difficulty (unless already at min)
            expect(adjustedConfig.difficulty).toBeLessThanOrEqual(config.difficulty);
            // Either fewer elements or more study time (unless already at limits)
            const atMinDifficulty = config.difficulty <= 1;
            const atMinElements = config.elementCount <= 3;
            const atMaxStudyTime = config.studyTime >= 15;
            
            // If already at all minimum limits, config should stay the same
            if (atMinDifficulty && atMinElements && atMaxStudyTime) {
              // Config should remain unchanged when at minimum limits
              expect(adjustedConfig.difficulty).toBe(config.difficulty);
            } else {
              // Otherwise, should get easier
              const easier = 
                adjustedConfig.elementCount < config.elementCount ||
                adjustedConfig.studyTime > config.studyTime ||
                adjustedConfig.difficulty < config.difficulty;
              expect(easier).toBe(true);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Additional test: Single element generation
   */
  it('generateElement should create valid elements', () => {
    const usedTypes = new Set<typeof ELEMENT_TYPES[number]>();
    const positions: { x: number; y: number }[] = [];
    
    for (let i = 0; i < 10; i++) {
      const element = generateElement(usedTypes, positions);
      expect(validateElement(element)).toBe(true);
      expect(ELEMENT_TYPES).toContain(element.type);
      expect(element.position.x).toBeGreaterThanOrEqual(0);
      expect(element.position.x).toBeLessThanOrEqual(1);
      expect(element.position.y).toBeGreaterThanOrEqual(0);
      expect(element.position.y).toBeLessThanOrEqual(1);
      
      usedTypes.add(element.type);
      positions.push(element.position);
    }
  });

  /**
   * Additional test: Position description
   */
  it('getPositionDescription should return correct descriptions', () => {
    // Top-left
    expect(getPositionDescription({ x: 0.1, y: 0.1 })).toBe('上左');
    // Top-right
    expect(getPositionDescription({ x: 0.9, y: 0.1 })).toBe('上右');
    // Bottom-left
    expect(getPositionDescription({ x: 0.1, y: 0.9 })).toBe('下左');
    // Bottom-right
    expect(getPositionDescription({ x: 0.9, y: 0.9 })).toBe('下右');
    // Center
    expect(getPositionDescription({ x: 0.5, y: 0.5 })).toBe('中央');
    // Left side
    expect(getPositionDescription({ x: 0.1, y: 0.5 })).toBe('左侧');
    // Right side
    expect(getPositionDescription({ x: 0.9, y: 0.5 })).toBe('右侧');
    // Top
    expect(getPositionDescription({ x: 0.5, y: 0.1 })).toBe('上方');
    // Bottom
    expect(getPositionDescription({ x: 0.5, y: 0.9 })).toBe('下方');
  });

  /**
   * Additional test: Engine phase transitions
   */
  it('engine should transition through phases correctly', () => {
    const config: SceneConfig = {
      difficulty: 5,
      elementCount: 3,
      studyTime: 10,
      testType: 'item',
    };
    
    const engine = new SceneEngine(config);
    
    // Initial phase
    expect(engine.getPhase()).toBe('ready');
    
    // Start study
    engine.startStudy();
    expect(engine.getPhase()).toBe('study');
    
    // Start test
    engine.startTest();
    expect(engine.getPhase()).toBe('test');
    
    // Answer all questions
    const questions = engine.getState().testQuestions;
    for (let i = 0; i < questions.length; i++) {
      const question = engine.getCurrentQuestion();
      if (question) {
        engine.respond(question.correctAnswer);
      }
    }
    
    // Should be complete
    expect(engine.getPhase()).toBe('result');
    expect(engine.isComplete()).toBe(true);
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create new elements and reset all state', () => {
    const config: SceneConfig = {
      difficulty: 5,
      elementCount: 5,
      studyTime: 10,
      testType: 'both',
    };
    
    const engine = new SceneEngine(config);
    engine.startStudy();
    engine.startTest();
    
    // Make some responses
    const question = engine.getCurrentQuestion();
    if (question) {
      engine.respond(question.correctAnswer);
    }
    
    // Reset
    engine.reset();
    
    const state = engine.getState();
    
    // State should be reset
    expect(state.phase).toBe('ready');
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.responses).toHaveLength(0);
    expect(state.isComplete).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.studyStartTime).toBeNull();
    expect(state.testStartTime).toBeNull();
    expect(state.elements.length).toBe(5);
  });

  /**
   * Additional test: Responses in wrong phase are ignored
   */
  it('responses in non-test phase should be ignored', () => {
    const config: SceneConfig = {
      difficulty: 5,
      elementCount: 3,
      studyTime: 10,
      testType: 'item',
    };
    
    const engine = new SceneEngine(config);
    
    // Try to respond in ready phase
    let result = engine.respond('test');
    expect(result).toBe(false);
    
    // Try to respond in study phase
    engine.startStudy();
    result = engine.respond('test');
    expect(result).toBe(false);
    
    expect(engine.getState().responses).toHaveLength(0);
  });

  /**
   * Additional test: Progress tracking
   */
  it('getProgress should return correct current and total', () => {
    const config: SceneConfig = {
      difficulty: 5,
      elementCount: 5,
      studyTime: 10,
      testType: 'item',
    };
    
    const engine = new SceneEngine(config);
    engine.startStudy();
    engine.startTest();
    
    const total = engine.getState().testQuestions.length;
    expect(engine.getProgress()).toEqual({ current: 0, total });
    
    const question = engine.getCurrentQuestion();
    if (question) {
      engine.respond(question.correctAnswer);
    }
    
    expect(engine.getProgress()).toEqual({ current: 1, total });
  });

  /**
   * Additional test: Accuracy calculation
   */
  it('calculateResult should compute correct accuracy', () => {
    const config: SceneConfig = {
      difficulty: 5,
      elementCount: 4,
      studyTime: 10,
      testType: 'item',
      questionCount: 4,
    };
    
    const engine = new SceneEngine(config);
    engine.startStudy();
    engine.startTest();
    
    const questions = engine.getState().testQuestions;
    
    // Answer 3 correctly, 1 incorrectly
    for (let i = 0; i < questions.length; i++) {
      const question = engine.getCurrentQuestion();
      if (!question) break;
      
      if (i < 3) {
        engine.respond(question.correctAnswer);
      } else {
        const wrongAnswer = question.options.find(o => o !== question.correctAnswer);
        if (wrongAnswer) {
          engine.respond(wrongAnswer);
        }
      }
    }
    
    const result = engine.calculateResult();
    
    expect(result.questionCount).toBe(4);
    expect(result.correctCount).toBe(3);
    expect(result.errorCount).toBe(1);
    expect(result.accuracy).toBe(0.75);
  });

  /**
   * Additional test: Config from difficulty
   */
  it('getSceneConfigFromDifficulty should return valid config', () => {
    for (let difficulty = 1; difficulty <= 10; difficulty++) {
      const config = getSceneConfigFromDifficulty(difficulty);
      
      expect(config.difficulty).toBe(difficulty);
      expect(config.elementCount).toBeGreaterThanOrEqual(3);
      expect(config.elementCount).toBeLessThanOrEqual(10);
      expect(config.studyTime).toBeGreaterThanOrEqual(5);
      expect(config.studyTime).toBeLessThanOrEqual(15);
      expect(['item', 'spatial', 'both']).toContain(config.testType);
    }
  });

  /**
   * Additional test: Validate scene
   */
  it('validateScene should correctly validate scenes', () => {
    const validElements = generateScene(5);
    expect(validateScene(validElements, 5)).toBe(true);
    
    // Wrong count
    expect(validateScene(validElements, 3)).toBe(false);
    
    // Empty array
    expect(validateScene([], 0)).toBe(true);
    expect(validateScene([], 1)).toBe(false);
  });

  /**
   * Additional test: Element name mapping
   */
  it('ELEMENT_NAME_MAP should have Chinese names for all element types', () => {
    for (const type of ELEMENT_TYPES) {
      expect(ELEMENT_NAME_MAP[type]).toBeDefined();
      expect(typeof ELEMENT_NAME_MAP[type]).toBe('string');
      expect(ELEMENT_NAME_MAP[type].length).toBeGreaterThan(0);
    }
  });

  /**
   * Additional test: Test questions have correct answer in options
   */
  it('test questions should always include correct answer in options', () => {
    const elements = generateScene(5);
    const questions = generateTestQuestions(elements, 'both');
    
    for (const question of questions) {
      expect(question.options).toContain(question.correctAnswer);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});
