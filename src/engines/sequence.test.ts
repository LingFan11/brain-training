/**
 * SequenceEngine Property Tests
 * 
 * Property 10: Sequence Generation
 * Property 11: N-back Match Detection
 * Property 12: Adaptive Difficulty
 * 
 * **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SequenceEngine,
  generateSequence,
  detectNBackMatch,
  adjustDifficulty,
  validateSequence,
  getStimuliForType,
  type SequenceConfig,
  type StimulusType,
} from './sequence';

// Arbitrary for valid N-back values (1-4)
const nBackArb = fc.integer({ min: 1, max: 4 });

// Arbitrary for valid sequence lengths (must be > nBack)
const sequenceLengthArb = fc.integer({ min: 10, max: 30 });

// Arbitrary for stimulus types
const stimulusTypeArb = fc.constantFrom('number', 'letter', 'position') as fc.Arbitrary<StimulusType>;

// Arbitrary for target ratio (0.1 to 0.5)
const targetRatioArb = fc.double({ min: 0.1, max: 0.5, noNaN: true });

// Arbitrary for difficulty (1-10)
const difficultyArb = fc.integer({ min: 1, max: 10 });

// Arbitrary for valid sequence config
const sequenceConfigArb = fc.record({
  nBack: nBackArb,
  sequenceLength: sequenceLengthArb,
  stimulusType: stimulusTypeArb,
  targetRatio: targetRatioArb,
  difficulty: difficultyArb,
}).filter(config => config.sequenceLength > config.nBack);

describe('SequenceEngine', () => {
  /**
   * Property 10: Sequence Generation
   * For any sequence memory configuration, the generated sequence should have 
   * exactly the specified length.
   * 
   * **Validates: Requirements 4.1**
   */
  it('Property 10: Sequence Generation - sequence should have exactly the specified length', () => {
    fc.assert(
      fc.property(sequenceConfigArb, (config) => {
        const sequence = generateSequence(config);
        
        // Sequence should have exact length
        expect(sequence.length).toBe(config.sequenceLength);
        
        // Each item should have correct index
        for (let i = 0; i < sequence.length; i++) {
          expect(sequence[i].index).toBe(i);
        }
        
        // Each stimulus should be valid for the type
        const validStimuli = getStimuliForType(config.stimulusType);
        for (const item of sequence) {
          expect(validStimuli).toContain(item.stimulus);
        }
        
        // Validate using helper function
        expect(validateSequence(sequence, config)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: N-back Match Detection
   * For any sequence and position i >= N, the N-back detection should return true 
   * if and only if sequence[i] equals sequence[i-N].
   * 
   * **Validates: Requirements 4.3, 4.4**
   */
  it('Property 11: N-back Match Detection - correctly identifies matches at N positions back', () => {
    fc.assert(
      fc.property(
        nBackArb,
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { minLength: 5, maxLength: 20 }),
        (nBack, sequence) => {
          // Test each position in the sequence
          for (let i = 0; i < sequence.length; i++) {
            const isMatch = detectNBackMatch(sequence, i, nBack);
            
            if (i < nBack) {
              // Positions before N cannot be matches
              expect(isMatch).toBe(false);
            } else {
              // Position i is a match iff sequence[i] === sequence[i-N]
              const expectedMatch = sequence[i] === sequence[i - nBack];
              expect(isMatch).toBe(expectedMatch);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Adaptive Difficulty
   * For any training module with adaptive difficulty, high accuracy (>80%) should 
   * trigger difficulty increase, and low accuracy (<50%) should trigger difficulty decrease.
   * 
   * **Validates: Requirements 4.5, 4.6**
   */
  it('Property 12: Adaptive Difficulty - adjusts based on accuracy thresholds', () => {
    fc.assert(
      fc.property(
        sequenceConfigArb,
        fc.double({ min: 0, max: 1, noNaN: true }),
        (config, accuracy) => {
          const adjustedConfig = adjustDifficulty(config, accuracy);
          
          if (accuracy > 0.8) {
            // High accuracy: difficulty should increase
            // Either nBack increases, or sequenceLength increases, or difficulty increases
            const difficultyIncreased = 
              adjustedConfig.nBack > config.nBack ||
              adjustedConfig.sequenceLength > config.sequenceLength ||
              (adjustedConfig.difficulty || 5) > (config.difficulty || 5);
            
            // If already at max, no change expected
            const atMax = config.nBack >= 4 && config.sequenceLength >= 30;
            expect(difficultyIncreased || atMax).toBe(true);
          } else if (accuracy < 0.5) {
            // Low accuracy: difficulty should decrease
            const difficultyDecreased = 
              adjustedConfig.nBack < config.nBack ||
              adjustedConfig.sequenceLength < config.sequenceLength ||
              (adjustedConfig.difficulty || 5) < (config.difficulty || 5);
            
            // If already at min, no change expected
            const atMin = config.nBack <= 1 && config.sequenceLength <= 10;
            expect(difficultyDecreased || atMin).toBe(true);
          } else {
            // Medium accuracy: config should remain unchanged
            expect(adjustedConfig.nBack).toBe(config.nBack);
            expect(adjustedConfig.sequenceLength).toBe(config.sequenceLength);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Additional test: Generated sequence has correct N-back target markers
   */
  it('generated sequence should have correct isTarget markers', () => {
    fc.assert(
      fc.property(sequenceConfigArb, (config) => {
        const sequence = generateSequence(config);
        const stimuli = sequence.map(item => item.stimulus);
        
        // Verify each item's isTarget flag matches actual N-back detection
        for (let i = 0; i < sequence.length; i++) {
          const actualMatch = detectNBackMatch(stimuli, i, config.nBack);
          expect(sequence[i].isTarget).toBe(actualMatch);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Engine response recording
   */
  it('engine should correctly record responses', () => {
    const config: SequenceConfig = {
      nBack: 2,
      sequenceLength: 10,
      stimulusType: 'letter',
      targetRatio: 0.3,
    };
    
    const engine = new SequenceEngine(config);
    engine.start();
    
    // Process each item
    for (let i = 0; i < config.sequenceLength; i++) {
      const item = engine.getCurrentItem();
      expect(item).not.toBeNull();
      
      if (item) {
        // Respond with whether we think it's a match
        const response = engine.respond(item.isTarget);
        expect(response).not.toBeNull();
        
        if (response) {
          // If we responded correctly (matching isTarget), it should be a hit or correct rejection
          if (item.isTarget) {
            expect(response.hit).toBe(true);
            expect(response.miss).toBe(false);
          } else {
            expect(response.correctRejection).toBe(true);
            expect(response.falseAlarm).toBe(false);
          }
        }
        
        engine.advance();
      }
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const result = engine.calculateResult();
    expect(result.accuracy).toBe(1); // Perfect accuracy since we responded correctly
    expect(result.hits + result.correctRejections).toBe(config.sequenceLength);
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create a new sequence and reset all state', () => {
    const config: SequenceConfig = {
      nBack: 2,
      sequenceLength: 15,
      stimulusType: 'number',
      targetRatio: 0.3,
    };
    
    const engine = new SequenceEngine(config);
    engine.start();
    
    // Make some progress
    engine.respond(true);
    engine.advance();
    engine.respond(false);
    engine.advance();
    
    // Reset
    engine.reset();
    
    const state = engine.getState();
    
    // State should be reset
    expect(state.currentIndex).toBe(0);
    expect(state.responses).toHaveLength(0);
    expect(state.isComplete).toBe(false);
    expect(state.phase).toBe('ready');
    expect(state.startTime).toBeNull();
    
    // Sequence should be regenerated (valid)
    expect(validateSequence(state.sequence, config)).toBe(true);
  });

  /**
   * Additional test: Progress tracking
   */
  it('getProgress should return correct current and total', () => {
    const config: SequenceConfig = {
      nBack: 1,
      sequenceLength: 10,
      stimulusType: 'letter',
    };
    
    const engine = new SequenceEngine(config);
    engine.start();
    
    let progress = engine.getProgress();
    expect(progress.current).toBe(0);
    expect(progress.total).toBe(10);
    
    // Advance a few times
    engine.respond(false);
    engine.advance();
    engine.respond(false);
    engine.advance();
    engine.respond(false);
    engine.advance();
    
    progress = engine.getProgress();
    expect(progress.current).toBe(3);
    expect(progress.total).toBe(10);
  });

  /**
   * Additional test: Result calculation with mixed responses
   */
  it('calculateResult should correctly compute all statistics', () => {
    const config: SequenceConfig = {
      nBack: 1,
      sequenceLength: 10,
      stimulusType: 'letter',
      targetRatio: 0.3,
    };
    
    const engine = new SequenceEngine(config);
    engine.start();
    
    // Process all items, sometimes responding incorrectly
    for (let i = 0; i < config.sequenceLength; i++) {
      const item = engine.getCurrentItem();
      if (item) {
        // Alternate between correct and incorrect responses
        const respondAsMatch = i % 2 === 0;
        engine.respond(respondAsMatch);
        engine.advance();
      }
    }
    
    const result = engine.calculateResult();
    
    // Verify result structure
    expect(result.nBack).toBe(config.nBack);
    expect(result.sequenceLength).toBe(config.sequenceLength);
    expect(result.hits + result.misses + result.falseAlarms + result.correctRejections).toBe(config.sequenceLength);
    expect(result.hitRate).toBeGreaterThanOrEqual(0);
    expect(result.hitRate).toBeLessThanOrEqual(1);
    expect(result.falseAlarmRate).toBeGreaterThanOrEqual(0);
    expect(result.falseAlarmRate).toBeLessThanOrEqual(1);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
