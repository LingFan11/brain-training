/**
 * ClassificationEngine Property Tests
 * 
 * Property 19: Classification Item Generation
 * Property 20: Classification Rule Determinism
 * Property 21: Classification Rule Switching
 * Property 22: Classification Difficulty Levels
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ClassificationEngine,
  generateItem,
  generateItems,
  generateRule,
  generateDifferentRule,
  validateItem,
  validateRule,
  validateRuleDeterminism,
  getConfigFromDifficulty,
  getAttributeCountFromDifficulty,
  SHAPES,
  COLORS,
  SIZES,
  type ClassificationItem,
  type ClassificationConfig,
} from './classification';

// Arbitrary for valid difficulty (1-10)
const difficultyArb = fc.integer({ min: 1, max: 10 });

// Arbitrary for valid attribute count (1-3)
const attributeCountArb = fc.integer({ min: 1, max: 3 });

// Arbitrary for valid item count (5-50)
const itemCountArb = fc.integer({ min: 5, max: 50 });

// Arbitrary for valid classification item
const classificationItemArb = fc.record({
  shape: fc.constantFrom(...SHAPES),
  color: fc.constantFrom(...COLORS),
  size: fc.constantFrom(...SIZES),
}) as fc.Arbitrary<ClassificationItem>;

describe('ClassificationEngine', () => {
  /**
   * Property 19: Classification Item Generation
   * For any classification configuration, generated items should have all 
   * required attributes (shape, color, size) with valid values.
   * 
   * **Validates: Requirements 7.1**
   */
  it('Property 19: Classification Item Generation - items have all valid attributes', () => {
    fc.assert(
      fc.property(itemCountArb, (count) => {
        const items = generateItems(count);
        
        // Should have correct number of items
        expect(items.length).toBe(count);
        
        // All items should be valid
        for (const item of items) {
          expect(validateItem(item)).toBe(true);
          
          // Shape should be valid
          expect(SHAPES).toContain(item.shape);
          
          // Color should be valid
          expect(COLORS).toContain(item.color);
          
          // Size should be valid
          expect(SIZES).toContain(item.size);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Property 20: Classification Rule Determinism
   * For any classification rule and item, applying the rule to the same 
   * item multiple times should always return the same result.
   * 
   * **Validates: Requirements 7.2, 7.3**
   */
  it('Property 20: Classification Rule Determinism - same item always produces same result', () => {
    fc.assert(
      fc.property(
        attributeCountArb,
        classificationItemArb,
        (attributeCount, item) => {
          const rule = generateRule(attributeCount);
          
          // Rule should be valid
          expect(validateRule(rule)).toBe(true);
          
          // Apply rule multiple times to same item
          const result1 = rule.test(item);
          const result2 = rule.test(item);
          const result3 = rule.test(item);
          
          // All results should be the same
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          
          // Validate using helper function
          expect(validateRuleDeterminism(rule, item)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21: Classification Rule Switching
   * For any classification session, achieving the required consecutive 
   * correct answers should trigger a rule change to a different rule.
   * 
   * **Validates: Requirements 7.4**
   */
  it('Property 21: Classification Rule Switching - consecutive correct triggers rule change', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // consecutiveToSwitch
        fc.integer({ min: 1, max: 3 }), // attributeCount
        (consecutiveToSwitch, attributeCount) => {
          const config: ClassificationConfig = {
            difficulty: 5,
            attributeCount,
            itemCount: consecutiveToSwitch * 3, // Enough items to trigger switch
            consecutiveToSwitch,
          };
          
          const engine = new ClassificationEngine(config);
          engine.start();
          
          const initialRule = engine.getCurrentRule();
          const initialRulesDiscovered = engine.getRulesDiscovered();
          
          // Answer correctly consecutiveToSwitch times
          for (let i = 0; i < consecutiveToSwitch; i++) {
            const item = engine.getCurrentItem();
            if (!item) break;
            
            // Get the correct answer
            const correctAnswer = initialRule.test(item);
            engine.respond(correctAnswer);
          }
          
          // Rule should have changed
          const newRulesDiscovered = engine.getRulesDiscovered();
          expect(newRulesDiscovered).toBe(initialRulesDiscovered + 1);
          
          // Consecutive correct should be reset
          expect(engine.getConsecutiveCorrect()).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22: Classification Difficulty Levels
   * For any classification configuration, higher difficulty should produce 
   * rules involving more attributes.
   * 
   * **Validates: Requirements 7.5**
   */
  it('Property 22: Classification Difficulty Levels - higher difficulty means more attributes', () => {
    fc.assert(
      fc.property(difficultyArb, (difficulty) => {
        const attributeCount = getAttributeCountFromDifficulty(difficulty);
        
        // Attribute count should be 1-3
        expect(attributeCount).toBeGreaterThanOrEqual(1);
        expect(attributeCount).toBeLessThanOrEqual(3);
        
        // Low difficulty (1-3) should have 1 attribute
        if (difficulty <= 3) {
          expect(attributeCount).toBe(1);
        }
        // Medium difficulty (4-6) should have 2 attributes
        else if (difficulty <= 6) {
          expect(attributeCount).toBe(2);
        }
        // High difficulty (7-10) should have 3 attributes
        else {
          expect(attributeCount).toBe(3);
        }
        
        // Generated rule should have correct attribute count
        const rule = generateRule(attributeCount);
        expect(rule.attributeCount).toBe(attributeCount);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Additional test: Single item generation
   */
  it('generateItem should create valid items', () => {
    for (let i = 0; i < 10; i++) {
      const item = generateItem();
      expect(validateItem(item)).toBe(true);
      expect(SHAPES).toContain(item.shape);
      expect(COLORS).toContain(item.color);
      expect(SIZES).toContain(item.size);
    }
  });

  /**
   * Additional test: Rule generation for different attribute counts
   */
  it('generateRule should create rules with correct attribute count', () => {
    // Single attribute rule
    const rule1 = generateRule(1);
    expect(rule1.attributeCount).toBe(1);
    expect(validateRule(rule1)).toBe(true);
    
    // Double attribute rule
    const rule2 = generateRule(2);
    expect(rule2.attributeCount).toBe(2);
    expect(validateRule(rule2)).toBe(true);
    
    // Triple attribute rule
    const rule3 = generateRule(3);
    expect(rule3.attributeCount).toBe(3);
    expect(validateRule(rule3)).toBe(true);
  });

  /**
   * Additional test: generateDifferentRule should produce different rule
   */
  it('generateDifferentRule should produce a different rule', () => {
    const originalRule = generateRule(1);
    
    // Try multiple times to ensure we get a different rule
    let foundDifferent = false;
    for (let i = 0; i < 10; i++) {
      const newRule = generateDifferentRule(originalRule, 1);
      if (newRule.id !== originalRule.id) {
        foundDifferent = true;
        break;
      }
    }
    
    // Should eventually find a different rule (with high probability)
    expect(foundDifferent).toBe(true);
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create new items and reset all state', () => {
    const config: ClassificationConfig = {
      difficulty: 5,
      attributeCount: 2,
      itemCount: 10,
      consecutiveToSwitch: 3,
    };
    const engine = new ClassificationEngine(config);
    engine.start();
    
    // Make some responses
    const item = engine.getCurrentItem();
    if (item) {
      const rule = engine.getCurrentRule();
      engine.respond(rule.test(item));
    }
    
    // Reset
    engine.reset();
    
    const state = engine.getState();
    
    // State should be reset
    expect(state.currentIndex).toBe(0);
    expect(state.responses).toHaveLength(0);
    expect(state.isComplete).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.consecutiveCorrect).toBe(0);
    expect(state.rulesDiscovered).toBe(1);
    expect(state.items.length).toBe(10);
  });

  /**
   * Additional test: Responses after completion are ignored
   */
  it('responses after completion should be ignored', () => {
    const config: ClassificationConfig = {
      difficulty: 5,
      attributeCount: 1,
      itemCount: 3,
      consecutiveToSwitch: 10, // High to prevent rule switching
    };
    const engine = new ClassificationEngine(config);
    engine.start();
    
    // Complete all items
    for (let i = 0; i < 3; i++) {
      const item = engine.getCurrentItem();
      if (item) {
        engine.respond(true);
      }
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const stateBefore = engine.getState();
    
    // Try to respond after completion
    const result = engine.respond(true);
    
    expect(result).toBe(false);
    
    const stateAfter = engine.getState();
    expect(stateAfter.responses.length).toBe(stateBefore.responses.length);
  });

  /**
   * Additional test: Progress tracking
   */
  it('getProgress should return correct current and total', () => {
    const config: ClassificationConfig = {
      difficulty: 5,
      attributeCount: 1,
      itemCount: 5,
      consecutiveToSwitch: 10,
    };
    const engine = new ClassificationEngine(config);
    
    expect(engine.getProgress()).toEqual({ current: 0, total: 5 });
    
    engine.start();
    const item = engine.getCurrentItem();
    if (item) {
      engine.respond(true);
    }
    
    expect(engine.getProgress()).toEqual({ current: 1, total: 5 });
  });

  /**
   * Additional test: Accuracy calculation
   */
  it('calculateResult should compute correct accuracy', () => {
    const config: ClassificationConfig = {
      difficulty: 5,
      attributeCount: 1,
      itemCount: 10,
      consecutiveToSwitch: 20, // High to prevent rule switching
    };
    const engine = new ClassificationEngine(config);
    engine.start();
    
    const rule = engine.getCurrentRule();
    
    // Answer 7 correctly, 3 incorrectly
    for (let i = 0; i < 10; i++) {
      const item = engine.getCurrentItem();
      if (!item) break;
      
      const correctAnswer = rule.test(item);
      if (i < 7) {
        engine.respond(correctAnswer);
      } else {
        engine.respond(!correctAnswer);
      }
    }
    
    const result = engine.calculateResult();
    
    expect(result.totalItems).toBe(10);
    expect(result.correctCount).toBe(7);
    expect(result.errorCount).toBe(3);
    expect(result.accuracy).toBe(0.7);
  });

  /**
   * Additional test: Config from difficulty
   */
  it('getConfigFromDifficulty should return valid config', () => {
    for (let difficulty = 1; difficulty <= 10; difficulty++) {
      const config = getConfigFromDifficulty(difficulty);
      
      expect(config.difficulty).toBe(difficulty);
      expect(config.attributeCount).toBeGreaterThanOrEqual(1);
      expect(config.attributeCount).toBeLessThanOrEqual(3);
      expect(config.itemCount).toBeGreaterThan(0);
      expect(config.consecutiveToSwitch).toBeGreaterThan(0);
    }
  });

  /**
   * Additional test: Consecutive correct resets on wrong answer
   */
  it('consecutive correct should reset on wrong answer', () => {
    const config: ClassificationConfig = {
      difficulty: 5,
      attributeCount: 1,
      itemCount: 10,
      consecutiveToSwitch: 10,
    };
    const engine = new ClassificationEngine(config);
    engine.start();
    
    const rule = engine.getCurrentRule();
    
    // Answer 2 correctly
    for (let i = 0; i < 2; i++) {
      const item = engine.getCurrentItem();
      if (!item) break;
      engine.respond(rule.test(item));
    }
    
    expect(engine.getConsecutiveCorrect()).toBe(2);
    
    // Answer 1 incorrectly
    const item = engine.getCurrentItem();
    if (item) {
      engine.respond(!rule.test(item));
    }
    
    expect(engine.getConsecutiveCorrect()).toBe(0);
  });
});
