/**
 * AIService Property Tests
 * 
 * Property 26: AI Fallback Templates
 * Property 27: AI Response Caching
 * 
 * **Validates: Requirements 9.4, 9.5**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { TrainingRecord, TrainingModuleType } from '@/lib/database.types';
import type { TrainingStats, ModuleStats } from './storage';
import {
  generateFeedback,
  generateRecommendation,
  suggestDifficulty,
  clearAICache,
  _testHelpers,
} from './ai';

const MODULE_TYPES: TrainingModuleType[] = [
  'schulte', 'stroop', 'sequence', 'auditory',
  'bilateral', 'classification', 'scene'
];

// Arbitrary for generating training records
const trainingRecordArb = fc.record({
  id: fc.uuid(),
  device_id: fc.constant('test-device-id'),
  module_type: fc.constantFrom(...MODULE_TYPES),
  score: fc.integer({ min: 0, max: 1000 }),
  accuracy: fc.float({ min: 0, max: 1, noNaN: true }),
  duration: fc.integer({ min: 1, max: 3600 }),
  difficulty: fc.integer({ min: 1, max: 10 }),
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: null }),
  created_at: fc.integer({ min: 1704067200000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
}) as fc.Arbitrary<TrainingRecord>;

// Arbitrary for generating module stats
const moduleStatsArb = fc.record({
  sessions: fc.integer({ min: 0, max: 100 }),
  avgScore: fc.integer({ min: 0, max: 1000 }),
  avgAccuracy: fc.float({ min: 0, max: 1, noNaN: true }),
  bestScore: fc.integer({ min: 0, max: 1000 }),
  trend: fc.constantFrom('improving', 'stable', 'declining') as fc.Arbitrary<'improving' | 'stable' | 'declining'>,
}) as fc.Arbitrary<ModuleStats>;

// Arbitrary for generating training stats
const trainingStatsArb = fc.record({
  totalSessions: fc.integer({ min: 0, max: 1000 }),
  totalDuration: fc.integer({ min: 0, max: 100000 }),
  streakDays: fc.integer({ min: 0, max: 365 }),
  moduleStats: fc.record({
    schulte: moduleStatsArb,
    stroop: moduleStatsArb,
    sequence: moduleStatsArb,
    auditory: moduleStatsArb,
    bilateral: moduleStatsArb,
    classification: moduleStatsArb,
    scene: moduleStatsArb,
  }),
}) as fc.Arbitrary<TrainingStats>;

describe('AIService', () => {
  beforeEach(() => {
    // Clear localStorage and cache before each test
    localStorage.clear();
    clearAICache();
    vi.clearAllMocks();
  });

  /**
   * Property 26: AI Fallback Templates
   * For any AI service call that fails, the service should return a valid 
   * pre-defined feedback template instead of throwing an error.
   * 
   * **Validates: Requirements 9.4**
   */
  describe('Property 26: AI Fallback Templates', () => {
    it('generateFeedback should return fallback template when API is not configured', async () => {
      await fc.assert(
        fc.asyncProperty(trainingRecordArb, async (record) => {
          // API is not configured (no env var), so it should use fallback
          const feedback = await generateFeedback(record);
          
          // Should return a non-empty string
          expect(feedback).toBeDefined();
          expect(typeof feedback).toBe('string');
          expect(feedback.length).toBeGreaterThan(0);
          
          // Should be one of the fallback templates
          const allTemplates = Object.values(_testHelpers.FALLBACK_FEEDBACK_TEMPLATES).flat();
          expect(allTemplates).toContain(feedback);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateRecommendation should return fallback template when API is not configured', async () => {
      await fc.assert(
        fc.asyncProperty(trainingStatsArb, async (stats) => {
          // API is not configured, so it should use fallback
          const recommendation = await generateRecommendation(stats);
          
          // Should return a non-empty string
          expect(recommendation).toBeDefined();
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
          
          // Should be one of the fallback templates or the welcome message
          const allTemplates = [
            ...Object.values(_testHelpers.FALLBACK_RECOMMENDATION_TEMPLATES).flat(),
            '欢迎开始认知训练！建议从舒尔特表开始，逐步尝试各个训练模块。',
          ];
          expect(allTemplates).toContain(recommendation);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('getFeedbackCategory should return correct category based on accuracy', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 100, noNaN: true }), (accuracy) => {
          const category = _testHelpers.getFeedbackCategory(accuracy);
          
          if (accuracy >= 90) {
            expect(category).toBe('excellent');
          } else if (accuracy >= 70) {
            expect(category).toBe('good');
          } else if (accuracy >= 50) {
            expect(category).toBe('average');
          } else {
            expect(category).toBe('needsImprovement');
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 27: AI Response Caching
   * For any AI service call with identical input parameters, the second call 
   * should return a cached response without making an API request.
   * 
   * **Validates: Requirements 9.5**
   */
  describe('Property 27: AI Response Caching', () => {
    it('generateFeedback should cache and return same response for identical inputs', async () => {
      await fc.assert(
        fc.asyncProperty(trainingRecordArb, async (record) => {
          // Clear cache
          clearAICache();
          
          // First call
          const feedback1 = await generateFeedback(record);
          
          // Second call with same input
          const feedback2 = await generateFeedback(record);
          
          // Both should return the same response (from cache)
          expect(feedback1).toBe(feedback2);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateRecommendation should cache and return same response for identical inputs', async () => {
      await fc.assert(
        fc.asyncProperty(trainingStatsArb, async (stats) => {
          // Clear cache
          clearAICache();
          
          // First call
          const recommendation1 = await generateRecommendation(stats);
          
          // Second call with same input
          const recommendation2 = await generateRecommendation(stats);
          
          // Both should return the same response (from cache)
          expect(recommendation1).toBe(recommendation2);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('cache should store entries with correct structure', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, response) => {
          // Clear cache
          clearAICache();
          
          // Set cache
          _testHelpers.setCache(key, response);
          
          // Get cache
          const cached = _testHelpers.getCache(key);
          
          // Should return the same response
          expect(cached).toBe(response);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('cache should expire after CACHE_EXPIRY_MS', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (key, response) => {
          // Clear cache
          clearAICache();
          
          // Manually create an expired cache entry
          const expiredEntry = {
            response,
            timestamp: Date.now() - _testHelpers.CACHE_EXPIRY_MS - 1000,
          };
          localStorage.setItem(_testHelpers.CACHE_KEY_PREFIX + key, JSON.stringify(expiredEntry));
          
          // Get cache should return null for expired entry
          const cached = _testHelpers.getCache(key);
          expect(cached).toBeNull();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('generateCacheKey should produce consistent keys for same input', () => {
      fc.assert(
        fc.property(fc.string(), fc.jsonValue(), (type, data) => {
          const key1 = _testHelpers.generateCacheKey(type, data);
          const key2 = _testHelpers.generateCacheKey(type, data);
          
          // Same input should produce same key
          expect(key1).toBe(key2);
          
          // Key should start with type
          expect(key1.startsWith(type + '_')).toBe(true);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional tests for suggestDifficulty
   */
  describe('suggestDifficulty', () => {
    it('should increase difficulty when accuracy is high', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(trainingRecordArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 9 }),
          async (records, currentDifficulty) => {
            // Set all records to high accuracy
            const highAccuracyRecords = records.map(r => ({ ...r, accuracy: 0.9 }));
            
            const suggested = await suggestDifficulty(highAccuracyRecords, currentDifficulty);
            
            // Should increase difficulty (but not exceed 10)
            expect(suggested).toBe(Math.min(currentDifficulty + 1, 10));
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should decrease difficulty when accuracy is low', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(trainingRecordArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 2, max: 10 }),
          async (records, currentDifficulty) => {
            // Set all records to low accuracy
            const lowAccuracyRecords = records.map(r => ({ ...r, accuracy: 0.4 }));
            
            const suggested = await suggestDifficulty(lowAccuracyRecords, currentDifficulty);
            
            // Should decrease difficulty (but not below 1)
            expect(suggested).toBe(Math.max(currentDifficulty - 1, 1));
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain difficulty when accuracy is moderate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(trainingRecordArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 10 }),
          async (records, currentDifficulty) => {
            // Set all records to moderate accuracy
            const moderateAccuracyRecords = records.map(r => ({ ...r, accuracy: 0.7 }));
            
            const suggested = await suggestDifficulty(moderateAccuracyRecords, currentDifficulty);
            
            // Should maintain current difficulty
            expect(suggested).toBe(currentDifficulty);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return current difficulty for empty records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (currentDifficulty) => {
            const suggested = await suggestDifficulty([], currentDifficulty);
            
            // Should return current difficulty unchanged
            expect(suggested).toBe(currentDifficulty);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
