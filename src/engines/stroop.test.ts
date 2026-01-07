/**
 * StroopEngine Property Tests
 * 
 * Property 7: Stroop Trial Generation
 * Property 8: Stroop Response Recording
 * Property 9: Stroop Accuracy Calculation
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  StroopEngine,
  generateTrials,
  generateTrial,
  validateTrial,
  CHINESE_COLORS,
  type StroopConfig,
  type ChineseColor,
} from './stroop';

// Arbitrary for valid congruent ratio (0-1)
const congruentRatioArb = fc.double({ min: 0, max: 1, noNaN: true });

// Arbitrary for valid trial count (5-50)
const trialCountArb = fc.integer({ min: 5, max: 50 });

// Arbitrary for valid Stroop config
const stroopConfigArb = fc.record({
  congruentRatio: congruentRatioArb,
  trialCount: trialCountArb,
});

// Arbitrary for Chinese colors
const chineseColorArb = fc.constantFrom(...CHINESE_COLORS) as fc.Arbitrary<ChineseColor>;

describe('StroopEngine', () => {
  /**
   * Property 7: Stroop Trial Generation
   * For any Stroop configuration with a specified congruent ratio, the generated 
   * trials should have approximately that ratio of congruent trials, and all 
   * words should be Chinese color words.
   * 
   * **Validates: Requirements 3.1, 3.5, 3.6**
   */
  it('Property 7: Stroop Trial Generation - trials have correct ratio and Chinese words', () => {
    fc.assert(
      fc.property(stroopConfigArb, (config) => {
        const trials = generateTrials(config);
        
        // Should have correct number of trials
        expect(trials.length).toBe(config.trialCount);
        
        // All trials should be valid
        for (const trial of trials) {
          expect(validateTrial(trial)).toBe(true);
          
          // Word should be a Chinese color word
          expect(CHINESE_COLORS).toContain(trial.word);
          
          // Ink color should be a Chinese color
          expect(CHINESE_COLORS).toContain(trial.inkColor);
          
          // Congruency should be correctly marked
          if (trial.isCongruent) {
            expect(trial.word).toBe(trial.inkColor);
          } else {
            expect(trial.word).not.toBe(trial.inkColor);
          }
        }
        
        // Check congruent ratio (allow for rounding)
        const congruentCount = trials.filter(t => t.isCongruent).length;
        const expectedCongruent = Math.round(config.trialCount * config.congruentRatio);
        
        // Allow ±1 difference due to rounding
        expect(Math.abs(congruentCount - expectedCongruent)).toBeLessThanOrEqual(1);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Property 8: Stroop Response Recording
   * For any Stroop trial, selecting the ink color should record a correct 
   * response, and selecting any other color should record an incorrect response.
   * 
   * **Validates: Requirements 3.2, 3.3**
   */
  it('Property 8: Stroop Response Recording - correct ink color records correct, others record incorrect', () => {
    fc.assert(
      fc.property(
        stroopConfigArb,
        chineseColorArb,
        (config, selectedColor) => {
          // Ensure at least one trial
          const safeConfig = { ...config, trialCount: Math.max(1, config.trialCount) };
          const engine = new StroopEngine(safeConfig);
          engine.start();
          
          const currentTrial = engine.getCurrentTrial();
          if (!currentTrial) {
            return true; // Skip if no trial
          }
          
          const isCorrect = engine.respond(selectedColor);
          const state = engine.getState();
          
          // Response should be recorded
          expect(state.responses.length).toBe(1);
          
          const response = state.responses[0];
          
          // Correct if selected color matches ink color
          if (selectedColor === currentTrial.inkColor) {
            expect(isCorrect).toBe(true);
            expect(response.correct).toBe(true);
          } else {
            expect(isCorrect).toBe(false);
            expect(response.correct).toBe(false);
          }
          
          // Response should record the selected color
          expect(response.selectedColor).toBe(selectedColor);
          
          // Response time should be non-negative
          expect(response.rt).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Stroop Accuracy Calculation
   * For any completed Stroop session, the accuracy should equal the number 
   * of correct responses divided by total responses.
   * 
   * **Validates: Requirements 3.4**
   */
  it('Property 9: Stroop Accuracy Calculation - accuracy equals correct/total', () => {
    fc.assert(
      fc.property(
        stroopConfigArb,
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        (config, responsePattern) => {
          // Use response pattern length as trial count
          const trialCount = Math.min(responsePattern.length, 50);
          const safeConfig = { ...config, trialCount };
          
          const engine = new StroopEngine(safeConfig);
          engine.start();
          
          let correctCount = 0;
          
          // Complete all trials
          for (let i = 0; i < trialCount; i++) {
            const trial = engine.getCurrentTrial();
            if (!trial) break;
            
            // Decide whether to answer correctly based on pattern
            const shouldBeCorrect = responsePattern[i];
            
            let selectedColor: ChineseColor;
            if (shouldBeCorrect) {
              selectedColor = trial.inkColor;
              correctCount++;
            } else {
              // Select a wrong color
              const wrongColors = CHINESE_COLORS.filter(c => c !== trial.inkColor);
              selectedColor = wrongColors[0];
            }
            
            engine.respond(selectedColor);
          }
          
          // Calculate result
          const result = engine.calculateResult();
          
          // Verify accuracy calculation
          // Note: The engine rounds accuracy to 2 decimal places, so we apply the same rounding
          const rawAccuracy = trialCount > 0 ? correctCount / trialCount : 0;
          const expectedAccuracy = Math.round(rawAccuracy * 100) / 100;
          expect(result.accuracy).toBe(expectedAccuracy);
          
          // Verify counts
          expect(result.correctCount).toBe(correctCount);
          expect(result.errorCount).toBe(trialCount - correctCount);
          expect(result.totalTrials).toBe(trialCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Single trial generation
   */
  it('generateTrial should create valid congruent and incongruent trials', () => {
    // Test congruent trial
    const congruentTrial = generateTrial(true);
    expect(congruentTrial.isCongruent).toBe(true);
    expect(congruentTrial.word).toBe(congruentTrial.inkColor);
    expect(CHINESE_COLORS).toContain(congruentTrial.word);
    
    // Test incongruent trial
    const incongruentTrial = generateTrial(false);
    expect(incongruentTrial.isCongruent).toBe(false);
    expect(incongruentTrial.word).not.toBe(incongruentTrial.inkColor);
    expect(CHINESE_COLORS).toContain(incongruentTrial.word);
    expect(CHINESE_COLORS).toContain(incongruentTrial.inkColor);
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create new trials and reset all state', () => {
    const config: StroopConfig = { congruentRatio: 0.5, trialCount: 10 };
    const engine = new StroopEngine(config);
    engine.start();
    
    // Make some responses
    const trial = engine.getCurrentTrial();
    if (trial) {
      engine.respond(trial.inkColor);
    }
    
    // Reset
    engine.reset();
    
    const state = engine.getState();
    
    // State should be reset
    expect(state.currentIndex).toBe(0);
    expect(state.responses).toHaveLength(0);
    expect(state.isComplete).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.trials.length).toBe(10);
  });

  /**
   * Additional test: Responses after completion are ignored
   */
  it('responses after completion should be ignored', () => {
    const config: StroopConfig = { congruentRatio: 0.5, trialCount: 3 };
    const engine = new StroopEngine(config);
    engine.start();
    
    // Complete all trials
    for (let i = 0; i < 3; i++) {
      const trial = engine.getCurrentTrial();
      if (trial) {
        engine.respond(trial.inkColor);
      }
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const stateBefore = engine.getState();
    
    // Try to respond after completion
    const result = engine.respond('红');
    
    expect(result).toBe(false);
    
    const stateAfter = engine.getState();
    expect(stateAfter.responses.length).toBe(stateBefore.responses.length);
  });

  /**
   * Additional test: Progress tracking
   */
  it('getProgress should return correct current and total', () => {
    const config: StroopConfig = { congruentRatio: 0.5, trialCount: 5 };
    const engine = new StroopEngine(config);
    
    expect(engine.getProgress()).toEqual({ current: 0, total: 5 });
    
    engine.start();
    const trial = engine.getCurrentTrial();
    if (trial) {
      engine.respond(trial.inkColor);
    }
    
    expect(engine.getProgress()).toEqual({ current: 1, total: 5 });
  });
});
