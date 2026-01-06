/**
 * AuditoryEngine Property Tests
 * 
 * Property 13: Auditory Trial Distribution
 * Property 14: Auditory Response Recording
 * Property 15: Auditory Stats Calculation
 * 
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.6**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  AuditoryEngine,
  generateAuditoryTrials,
  generateAuditoryTrial,
  validateAuditoryTrial,
  validateAuditoryTrials,
  recordResponse,
  calculateAuditoryStats,
  CHINESE_SOUNDS,
  type AuditoryConfig,
  type ChineseSound,
  type AuditoryResponse,
} from './auditory';

// Arbitrary for valid target ratio (0.1-0.5)
const targetRatioArb = fc.double({ min: 0.1, max: 0.5, noNaN: true });

// Arbitrary for valid trial count (10-40)
const trialCountArb = fc.integer({ min: 10, max: 40 });

// Arbitrary for Chinese sounds
const chineseSoundArb = fc.constantFrom(...CHINESE_SOUNDS) as fc.Arbitrary<ChineseSound>;

// Arbitrary for valid Auditory config
const auditoryConfigArb = fc.record({
  targetSound: chineseSoundArb,
  targetRatio: targetRatioArb,
  trialCount: trialCountArb,
});

describe('AuditoryEngine', () => {
  /**
   * Property 13: Auditory Trial Distribution
   * For any auditory attention configuration, the generated trials should 
   * contain the specified ratio of target sounds among distractors.
   * 
   * **Validates: Requirements 5.2**
   */
  it('Property 13: Auditory Trial Distribution - trials have correct target ratio', () => {
    fc.assert(
      fc.property(auditoryConfigArb, (config) => {
        const trials = generateAuditoryTrials(config);
        
        // Should have correct number of trials
        expect(trials.length).toBe(config.trialCount);
        
        // All trials should be valid
        for (let i = 0; i < trials.length; i++) {
          const trial = trials[i];
          expect(validateAuditoryTrial(trial, config.targetSound)).toBe(true);
          
          // Sound should be a valid Chinese sound
          expect(CHINESE_SOUNDS).toContain(trial.sound);
          
          // Index should be correct
          expect(trial.index).toBe(i);
          
          // Target marking should be correct
          if (trial.isTarget) {
            expect(trial.sound).toBe(config.targetSound);
          } else {
            expect(trial.sound).not.toBe(config.targetSound);
          }
        }
        
        // Check target ratio (allow for rounding)
        const targetCount = trials.filter(t => t.isTarget).length;
        const expectedTargets = Math.round(config.trialCount * config.targetRatio);
        
        // Allow ±1 difference due to rounding
        expect(Math.abs(targetCount - expectedTargets)).toBeLessThanOrEqual(1);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Property 14: Auditory Response Recording
   * For any auditory trial, responding to a target should record a hit, 
   * not responding to a target should record a miss, and responding to 
   * a non-target should record a false alarm.
   * 
   * **Validates: Requirements 5.3, 5.4**
   */
  it('Property 14: Auditory Response Recording - correct response types recorded', () => {
    fc.assert(
      fc.property(
        auditoryConfigArb,
        fc.boolean(),
        (config, shouldRespond) => {
          // Ensure at least one trial
          const safeConfig = { ...config, trialCount: Math.max(1, config.trialCount) };
          const engine = new AuditoryEngine(safeConfig);
          engine.start();
          
          const currentTrial = engine.getCurrentTrial();
          if (!currentTrial) {
            return true; // Skip if no trial
          }
          
          const isTarget = currentTrial.isTarget;
          
          if (shouldRespond) {
            // User responds (presses button)
            const response = engine.respond();
            expect(response).not.toBeNull();
            
            if (response) {
              expect(response.responded).toBe(true);
              expect(response.isTarget).toBe(isTarget);
              
              if (isTarget) {
                // Hit: responded to target
                expect(response.hit).toBe(true);
                expect(response.miss).toBe(false);
                expect(response.falseAlarm).toBe(false);
                expect(response.correctRejection).toBe(false);
              } else {
                // False alarm: responded to non-target
                expect(response.hit).toBe(false);
                expect(response.miss).toBe(false);
                expect(response.falseAlarm).toBe(true);
                expect(response.correctRejection).toBe(false);
              }
            }
          } else {
            // User does not respond, advance to next trial
            engine.advance();
            
            const state = engine.getState();
            expect(state.responses.length).toBe(1);
            
            const response = state.responses[0];
            expect(response.responded).toBe(false);
            expect(response.isTarget).toBe(isTarget);
            
            if (isTarget) {
              // Miss: did not respond to target
              expect(response.hit).toBe(false);
              expect(response.miss).toBe(true);
              expect(response.falseAlarm).toBe(false);
              expect(response.correctRejection).toBe(false);
            } else {
              // Correct rejection: did not respond to non-target
              expect(response.hit).toBe(false);
              expect(response.miss).toBe(false);
              expect(response.falseAlarm).toBe(false);
              expect(response.correctRejection).toBe(true);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Auditory Stats Calculation
   * For any completed auditory session, hit rate should equal hits / targets, 
   * and false alarm rate should equal false alarms / non-targets.
   * 
   * **Validates: Requirements 5.6**
   */
  it('Property 15: Auditory Stats Calculation - hit rate and false alarm rate correctly calculated', () => {
    fc.assert(
      fc.property(
        auditoryConfigArb,
        fc.array(fc.boolean(), { minLength: 10, maxLength: 40 }),
        (config, responsePattern) => {
          // Use response pattern length as trial count
          const trialCount = Math.min(responsePattern.length, 40);
          const safeConfig = { ...config, trialCount };
          
          const engine = new AuditoryEngine(safeConfig);
          engine.start();
          
          // Complete all trials based on response pattern
          for (let i = 0; i < trialCount; i++) {
            const trial = engine.getCurrentTrial();
            if (!trial) break;
            
            const shouldRespond = responsePattern[i];
            
            if (shouldRespond) {
              engine.respond();
            }
            engine.advance();
          }
          
          // Calculate result
          const result = engine.calculateResult();
          const state = engine.getState();
          
          // Count actual hits, misses, false alarms, correct rejections
          const hits = state.responses.filter(r => r.hit).length;
          const misses = state.responses.filter(r => r.miss).length;
          const falseAlarms = state.responses.filter(r => r.falseAlarm).length;
          const correctRejections = state.responses.filter(r => r.correctRejection).length;
          
          const targets = hits + misses;
          const nonTargets = falseAlarms + correctRejections;
          
          // Verify hit rate calculation
          const expectedHitRate = targets > 0 ? hits / targets : 0;
          expect(result.hitRate).toBe(Math.round(expectedHitRate * 100) / 100);
          
          // Verify false alarm rate calculation
          const expectedFARate = nonTargets > 0 ? falseAlarms / nonTargets : 0;
          expect(result.falseAlarmRate).toBe(Math.round(expectedFARate * 100) / 100);
          
          // Verify counts
          expect(result.hits).toBe(hits);
          expect(result.misses).toBe(misses);
          expect(result.falseAlarms).toBe(falseAlarms);
          expect(result.correctRejections).toBe(correctRejections);
          
          // Verify accuracy
          const expectedAccuracy = trialCount > 0 
            ? (hits + correctRejections) / trialCount 
            : 0;
          expect(result.accuracy).toBe(Math.round(expectedAccuracy * 100) / 100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Additional test: Single trial generation
   */
  it('generateAuditoryTrial should create valid target and non-target trials', () => {
    const targetSound: ChineseSound = '三';
    
    // Test target trial
    const targetTrial = generateAuditoryTrial(targetSound, true, 0);
    expect(targetTrial.isTarget).toBe(true);
    expect(targetTrial.sound).toBe(targetSound);
    expect(targetTrial.index).toBe(0);
    expect(CHINESE_SOUNDS).toContain(targetTrial.sound);
    
    // Test non-target trial
    const nonTargetTrial = generateAuditoryTrial(targetSound, false, 1);
    expect(nonTargetTrial.isTarget).toBe(false);
    expect(nonTargetTrial.sound).not.toBe(targetSound);
    expect(nonTargetTrial.index).toBe(1);
    expect(CHINESE_SOUNDS).toContain(nonTargetTrial.sound);
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create new trials and reset all state', () => {
    const config: AuditoryConfig = { 
      targetSound: '五', 
      targetRatio: 0.3, 
      trialCount: 15 
    };
    const engine = new AuditoryEngine(config);
    engine.start();
    
    // Make some responses
    engine.respond();
    engine.advance();
    
    // Reset
    engine.reset();
    
    const state = engine.getState();
    
    // State should be reset
    expect(state.currentIndex).toBe(0);
    expect(state.responses).toHaveLength(0);
    expect(state.isComplete).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.phase).toBe('ready');
    expect(state.trials.length).toBe(15);
  });

  /**
   * Additional test: Responses after completion are ignored
   */
  it('responses after completion should be ignored', () => {
    const config: AuditoryConfig = { 
      targetSound: '七', 
      targetRatio: 0.3, 
      trialCount: 3 
    };
    const engine = new AuditoryEngine(config);
    engine.start();
    
    // Complete all trials
    for (let i = 0; i < 3; i++) {
      engine.advance();
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const stateBefore = engine.getState();
    
    // Try to respond after completion
    const result = engine.respond();
    
    expect(result).toBeNull();
    
    const stateAfter = engine.getState();
    expect(stateAfter.responses.length).toBe(stateBefore.responses.length);
  });

  /**
   * Additional test: Progress tracking
   */
  it('getProgress should return correct current and total', () => {
    const config: AuditoryConfig = { 
      targetSound: '二', 
      targetRatio: 0.3, 
      trialCount: 5 
    };
    const engine = new AuditoryEngine(config);
    
    expect(engine.getProgress()).toEqual({ current: 0, total: 5 });
    
    engine.start();
    engine.advance();
    
    expect(engine.getProgress()).toEqual({ current: 1, total: 5 });
  });

  /**
   * Additional test: recordResponse helper function
   */
  it('recordResponse should correctly categorize response types', () => {
    // Hit: responded to target
    const hit = recordResponse(true, true, 500, 0);
    expect(hit.hit).toBe(true);
    expect(hit.miss).toBe(false);
    expect(hit.falseAlarm).toBe(false);
    expect(hit.correctRejection).toBe(false);
    
    // Miss: did not respond to target
    const miss = recordResponse(false, true, null, 1);
    expect(miss.hit).toBe(false);
    expect(miss.miss).toBe(true);
    expect(miss.falseAlarm).toBe(false);
    expect(miss.correctRejection).toBe(false);
    
    // False alarm: responded to non-target
    const falseAlarm = recordResponse(true, false, 300, 2);
    expect(falseAlarm.hit).toBe(false);
    expect(falseAlarm.miss).toBe(false);
    expect(falseAlarm.falseAlarm).toBe(true);
    expect(falseAlarm.correctRejection).toBe(false);
    
    // Correct rejection: did not respond to non-target
    const correctRejection = recordResponse(false, false, null, 3);
    expect(correctRejection.hit).toBe(false);
    expect(correctRejection.miss).toBe(false);
    expect(correctRejection.falseAlarm).toBe(false);
    expect(correctRejection.correctRejection).toBe(true);
  });

  /**
   * Additional test: calculateAuditoryStats helper function
   */
  it('calculateAuditoryStats should correctly calculate rates', () => {
    const responses: AuditoryResponse[] = [
      { index: 0, responded: true, isTarget: true, hit: true, miss: false, falseAlarm: false, correctRejection: false, rt: 500 },
      { index: 1, responded: false, isTarget: true, hit: false, miss: true, falseAlarm: false, correctRejection: false, rt: null },
      { index: 2, responded: true, isTarget: false, hit: false, miss: false, falseAlarm: true, correctRejection: false, rt: 400 },
      { index: 3, responded: false, isTarget: false, hit: false, miss: false, falseAlarm: false, correctRejection: true, rt: null },
    ];
    
    const stats = calculateAuditoryStats(responses);
    
    // Hit rate: 1 hit / 2 targets = 0.5
    expect(stats.hitRate).toBe(0.5);
    
    // False alarm rate: 1 false alarm / 2 non-targets = 0.5
    expect(stats.falseAlarmRate).toBe(0.5);
    
    // Accuracy: (1 hit + 1 correct rejection) / 4 total = 0.5
    expect(stats.accuracy).toBe(0.5);
  });

  /**
   * Additional test: validateAuditoryTrials
   */
  it('validateAuditoryTrials should validate trial sequences', () => {
    const config: AuditoryConfig = { 
      targetSound: '四', 
      targetRatio: 0.3, 
      trialCount: 10 
    };
    
    const trials = generateAuditoryTrials(config);
    
    // Valid trials should pass validation
    expect(validateAuditoryTrials(trials, config)).toBe(true);
    
    // Wrong count should fail
    const wrongCountConfig = { ...config, trialCount: 5 };
    expect(validateAuditoryTrials(trials, wrongCountConfig)).toBe(false);
  });
});
