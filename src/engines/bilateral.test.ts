/**
 * BilateralEngine Property Tests
 * 
 * Property 16: Bilateral Pattern Generation
 * Property 17: Bilateral Response Recording
 * Property 18: Bilateral Difficulty Scaling
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  BilateralEngine,
  generatePatterns,
  validatePattern,
  validatePatterns,
  validateMirrorPattern,
  calculateMirrorCoordinate,
  checkResponse,
  recordResponse,
  getBilateralConfigFromDifficulty,
  adjustBilateralDifficulty,
  type BilateralConfig,
} from './bilateral';

// Arbitrary for valid pattern complexity (1-5)
const patternComplexityArb = fc.integer({ min: 1, max: 5 });

// Arbitrary for valid time limit (500-5000ms)
const timeLimitArb = fc.integer({ min: 500, max: 5000 });

// Arbitrary for valid pattern count (3-20)
const patternCountArb = fc.integer({ min: 3, max: 20 });

// Arbitrary for mirror ratio (0-1)
const mirrorRatioArb = fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true });

// Arbitrary for valid coordinate (0-1)
const coordinateArb = fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true });

// Arbitrary for valid target
const targetArb = fc.record({
  x: coordinateArb,
  y: coordinateArb,
});

// Arbitrary for valid config
const configArb = fc.record({
  patternComplexity: patternComplexityArb,
  timeLimit: timeLimitArb,
  patternCount: patternCountArb,
  mirrorRatio: mirrorRatioArb,
});

describe('BilateralEngine', () => {
  /**
   * Property 16: Bilateral Pattern Generation
   * For any bilateral coordination configuration, generated patterns should have 
   * valid left and right target coordinates, and mirror patterns should have 
   * symmetric coordinates (leftX = 1 - rightX).
   * 
   * **Validates: Requirements 6.1, 6.4**
   */
  it('Property 16: Bilateral Pattern Generation - patterns have valid coordinates and mirror symmetry', () => {
    fc.assert(
      fc.property(configArb, (config) => {
        const patterns = generatePatterns(config);
        
        // Should generate correct number of patterns
        expect(patterns.length).toBe(config.patternCount);
        
        // Check each pattern
        for (const pattern of patterns) {
          // Coordinates should be in valid range (0-1)
          expect(pattern.leftTarget.x).toBeGreaterThanOrEqual(0);
          expect(pattern.leftTarget.x).toBeLessThanOrEqual(1);
          expect(pattern.leftTarget.y).toBeGreaterThanOrEqual(0);
          expect(pattern.leftTarget.y).toBeLessThanOrEqual(1);
          expect(pattern.rightTarget.x).toBeGreaterThanOrEqual(0);
          expect(pattern.rightTarget.x).toBeLessThanOrEqual(1);
          expect(pattern.rightTarget.y).toBeGreaterThanOrEqual(0);
          expect(pattern.rightTarget.y).toBeLessThanOrEqual(1);
          
          // Pattern should be valid
          expect(validatePattern(pattern)).toBe(true);
          
          // If mirror pattern, check symmetry
          if (pattern.isMirror) {
            // leftX should equal 1 - rightX (with tolerance for floating point)
            const expectedLeftX = 1 - pattern.rightTarget.x;
            expect(Math.abs(pattern.leftTarget.x - expectedLeftX)).toBeLessThan(0.0001);
            
            // Y coordinates should be equal
            expect(Math.abs(pattern.leftTarget.y - pattern.rightTarget.y)).toBeLessThan(0.0001);
            
            // Validate mirror pattern
            expect(validateMirrorPattern(pattern)).toBe(true);
          }
        }
        
        // Check mirror ratio (allow rounding error of 1)
        const mirrorCount = patterns.filter(p => p.isMirror).length;
        const expectedMirror = Math.round(config.patternCount * config.mirrorRatio);
        expect(Math.abs(mirrorCount - expectedMirror)).toBeLessThanOrEqual(1);
        
        // Validate entire pattern set
        expect(validatePatterns(patterns, config)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Bilateral Response Recording
   * For any bilateral pattern, touching both targets within the time limit should 
   * record correct, and any other response should record incorrect.
   * 
   * **Validates: Requirements 6.2, 6.3**
   */
  it('Property 17: Bilateral Response Recording - correct response requires both targets within time limit', () => {
    fc.assert(
      fc.property(
        timeLimitArb,
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 0, max: 10000 }),
        (timeLimit, leftTouched, rightTouched, timing) => {
          const { correct, withinTimeLimit } = checkResponse(
            leftTouched,
            rightTouched,
            timing,
            timeLimit
          );
          
          // Within time limit check
          expect(withinTimeLimit).toBe(timing <= timeLimit);
          
          // Correct only if both touched AND within time limit
          const expectedCorrect = leftTouched && rightTouched && timing <= timeLimit;
          expect(correct).toBe(expectedCorrect);
          
          // Test recordResponse function
          const response = recordResponse(0, leftTouched, rightTouched, timing, timeLimit);
          expect(response.correct).toBe(expectedCorrect);
          expect(response.leftTouched).toBe(leftTouched);
          expect(response.rightTouched).toBe(rightTouched);
          expect(response.timing).toBe(timing);
          expect(response.withinTimeLimit).toBe(timing <= timeLimit);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: Bilateral Difficulty Scaling
   * For any bilateral configuration, increasing difficulty should result in 
   * more patterns or shorter time limits.
   * 
   * **Validates: Requirements 6.5**
   */
  it('Property 18: Bilateral Difficulty Scaling - higher difficulty means more patterns or shorter time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (difficulty) => {
          const lowerConfig = getBilateralConfigFromDifficulty(difficulty);
          const higherConfig = getBilateralConfigFromDifficulty(difficulty + 1);
          
          // Higher difficulty should have either:
          // - More patterns, OR
          // - Shorter time limit, OR
          // - Higher pattern complexity
          const isHarder = 
            higherConfig.patternCount > lowerConfig.patternCount ||
            higherConfig.timeLimit < lowerConfig.timeLimit ||
            higherConfig.patternComplexity > lowerConfig.patternComplexity;
          
          expect(isHarder).toBe(true);
          
          // Difficulty value should be set correctly
          expect(lowerConfig.difficulty).toBe(difficulty);
          expect(higherConfig.difficulty).toBe(difficulty + 1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Mirror coordinate calculation
   */
  it('calculateMirrorCoordinate should produce symmetric x coordinate', () => {
    fc.assert(
      fc.property(targetArb, (target) => {
        const mirror = calculateMirrorCoordinate(target);
        
        // X should be mirrored
        expect(Math.abs(mirror.x - (1 - target.x))).toBeLessThan(0.0001);
        
        // Y should be the same
        expect(mirror.y).toBe(target.y);
        
        // Double mirror should return to original
        const doubleMirror = calculateMirrorCoordinate(mirror);
        expect(Math.abs(doubleMirror.x - target.x)).toBeLessThan(0.0001);
        expect(doubleMirror.y).toBe(target.y);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Adaptive difficulty adjustment
   */
  it('adjustBilateralDifficulty should increase difficulty for high accuracy', () => {
    const config = getBilateralConfigFromDifficulty(5);
    
    // High accuracy (>80%) should increase difficulty
    const harderConfig = adjustBilateralDifficulty(config, 0.85);
    expect(
      harderConfig.timeLimit < config.timeLimit ||
      harderConfig.patternCount > config.patternCount ||
      (harderConfig.difficulty || 0) > (config.difficulty || 0)
    ).toBe(true);
    
    // Low accuracy (<50%) should decrease difficulty
    const easierConfig = adjustBilateralDifficulty(config, 0.4);
    expect(
      easierConfig.timeLimit > config.timeLimit ||
      easierConfig.patternCount < config.patternCount ||
      (easierConfig.difficulty || 0) < (config.difficulty || 0)
    ).toBe(true);
    
    // Medium accuracy (50-80%) should keep same difficulty
    const sameConfig = adjustBilateralDifficulty(config, 0.65);
    expect(sameConfig.difficulty).toBe(config.difficulty);
  });

  /**
   * Additional test: Engine complete flow
   */
  it('Engine should track progress and complete correctly', () => {
    const config: BilateralConfig = {
      patternComplexity: 2,
      timeLimit: 2000,
      patternCount: 5,
      mirrorRatio: 0.5,
    };
    
    const engine = new BilateralEngine(config);
    engine.start();
    
    // Complete all patterns with correct responses
    for (let i = 0; i < config.patternCount; i++) {
      const pattern = engine.getCurrentPattern();
      expect(pattern).not.toBeNull();
      
      // Respond correctly (both touched, within time)
      const response = engine.respond(true, true);
      expect(response).not.toBeNull();
      expect(response!.correct).toBe(true);
      
      engine.advance();
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const result = engine.calculateResult();
    expect(result.correctCount).toBe(config.patternCount);
    expect(result.accuracy).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  /**
   * Additional test: Responses after completion are ignored
   */
  it('responses after completion should be ignored', () => {
    const config: BilateralConfig = {
      patternComplexity: 1,
      timeLimit: 2000,
      patternCount: 2,
    };
    
    const engine = new BilateralEngine(config);
    engine.start();
    
    // Complete all patterns
    for (let i = 0; i < config.patternCount; i++) {
      engine.respond(true, true);
      engine.advance();
    }
    
    expect(engine.isComplete()).toBe(true);
    
    // Try to respond after completion
    const response = engine.respond(true, true);
    expect(response).toBeNull();
    
    // Try to advance after completion
    const advanced = engine.advance();
    expect(advanced).toBe(false);
  });
});
