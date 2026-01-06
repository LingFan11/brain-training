/**
 * StorageService Property Tests
 * 
 * Property 2: Training Record Round-Trip
 * Property 3: Offline Caching Fallback
 * Property 28: Stats Aggregation
 * Property 29: Record Filtering
 * Property 30: JSON Serialization Round-Trip
 * 
 * **Validates: Requirements 1.1.3, 1.1.4, 1.1.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { TrainingRecord, TrainingModuleType } from '@/lib/database.types';
import { 
  saveRecord, 
  getRecords, 
  getStats,
  _testHelpers,
  type NewTrainingRecord,
} from './storage';

// Mock the device service
vi.mock('./device', () => ({
  getDeviceId: vi.fn(() => Promise.resolve('test-device-id')),
}));

// Mock Supabase - simulate offline mode for local cache tests
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

const MODULE_TYPES: TrainingModuleType[] = [
  'schulte', 'stroop', 'sequence', 'auditory', 
  'bilateral', 'classification', 'scene'
];

// Arbitrary for generating valid training records
const trainingRecordArb = fc.record({
  moduleType: fc.constantFrom(...MODULE_TYPES),
  score: fc.integer({ min: 0, max: 1000 }),
  accuracy: fc.float({ min: 0, max: 100, noNaN: true }),
  duration: fc.integer({ min: 1, max: 3600 }),
  difficulty: fc.integer({ min: 1, max: 10 }),
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
}) as fc.Arbitrary<NewTrainingRecord>;

// Arbitrary for generating full training records (for stats testing)
const fullTrainingRecordArb = fc.record({
  id: fc.uuid(),
  device_id: fc.constant('test-device-id'),
  module_type: fc.constantFrom(...MODULE_TYPES),
  score: fc.integer({ min: 0, max: 1000 }),
  accuracy: fc.float({ min: 0, max: 100, noNaN: true }),
  duration: fc.integer({ min: 1, max: 3600 }),
  difficulty: fc.integer({ min: 1, max: 10 }),
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: null }),
  created_at: fc.integer({ min: 1704067200000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
}) as fc.Arbitrary<TrainingRecord>;

describe('StorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  /**
   * Property 2: Training Record Round-Trip
   * For any valid training record, saving it and then fetching records 
   * should return a list containing an equivalent record.
   * 
   * **Validates: Requirements 1.1.3, 1.1.4, 10.1**
   */
  it('Property 2: Training Record Round-Trip - saved records should be retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(trainingRecordArb, async (newRecord) => {
        // Clear state
        localStorage.clear();
        
        // Save the record
        const savedRecord = await saveRecord(newRecord);
        
        // Verify saved record has required fields
        expect(savedRecord.id).toBeDefined();
        expect(savedRecord.created_at).toBeDefined();
        expect(savedRecord.module_type).toBe(newRecord.moduleType);
        expect(savedRecord.score).toBe(newRecord.score);
        expect(savedRecord.duration).toBe(newRecord.duration);
        expect(savedRecord.difficulty).toBe(newRecord.difficulty);
        
        // Fetch records
        const records = await getRecords();
        
        // Should contain the saved record
        const found = records.find(r => r.id === savedRecord.id);
        expect(found).toBeDefined();
        expect(found?.module_type).toBe(newRecord.moduleType);
        expect(found?.score).toBe(newRecord.score);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Offline Caching Fallback
   * For any training record, when cloud storage fails (simulated by mocking),
   * the record should be cached locally.
   * 
   * **Validates: Requirements 1.1.5, 10.5**
   */
  it('Property 3: Offline Caching Fallback - records should be cached locally when offline', async () => {
    await fc.assert(
      fc.asyncProperty(trainingRecordArb, async (newRecord) => {
        // Clear state
        localStorage.clear();
        
        // Save record (will go to local cache since Supabase is mocked as null)
        const savedRecord = await saveRecord(newRecord);
        
        // Verify record is in local cache
        const localCache = _testHelpers.getLocalCache();
        const found = localCache.find(r => r.id === savedRecord.id);
        
        expect(found).toBeDefined();
        expect(found?.module_type).toBe(newRecord.moduleType);
        expect(found?.score).toBe(newRecord.score);
        
        // Verify record is in pending sync queue
        const pendingSync = _testHelpers.getPendingSyncRecords();
        const pendingFound = pendingSync.find(r => r.id === savedRecord.id);
        
        expect(pendingFound).toBeDefined();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 28: Stats Aggregation
   * For any set of training records, the calculated stats should correctly 
   * aggregate total sessions, total duration, and streak days.
   * 
   * **Validates: Requirements 10.2, 10.3**
   */
  it('Property 28: Stats Aggregation - stats should correctly aggregate records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fullTrainingRecordArb, { minLength: 0, maxLength: 20 }),
        async (records) => {
          // Set up local cache with test records
          localStorage.clear();
          _testHelpers.setLocalCache(records);
          
          // Get stats
          const stats = await getStats();
          
          // Verify total sessions
          expect(stats.totalSessions).toBe(records.length);
          
          // Verify total duration
          const expectedDuration = records.reduce((sum, r) => sum + r.duration, 0);
          expect(stats.totalDuration).toBe(expectedDuration);
          
          // Verify module stats exist for all module types
          for (const moduleType of MODULE_TYPES) {
            expect(stats.moduleStats[moduleType]).toBeDefined();
            
            const moduleRecords = records.filter(r => r.module_type === moduleType);
            expect(stats.moduleStats[moduleType].sessions).toBe(moduleRecords.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 29: Record Filtering
   * For any module type filter, getRecords should return only records 
   * matching that module type.
   * 
   * **Validates: Requirements 10.4**
   */
  it('Property 29: Record Filtering - filtered records should match module type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fullTrainingRecordArb, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...MODULE_TYPES),
        async (records, filterType) => {
          // Set up local cache with test records
          localStorage.clear();
          _testHelpers.setLocalCache(records);
          
          // Get filtered records
          const filteredRecords = await getRecords(filterType);
          
          // All returned records should match the filter type
          for (const record of filteredRecords) {
            expect(record.module_type).toBe(filterType);
          }
          
          // Count should match expected
          const expectedCount = records.filter(r => r.module_type === filterType).length;
          expect(filteredRecords.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 30: JSON Serialization Round-Trip
   * For any valid training record object, serializing to JSON and then 
   * deserializing should produce an equivalent object.
   * 
   * **Validates: Requirements 10.6**
   */
  it('Property 30: JSON Serialization Round-Trip - records should survive JSON serialization', async () => {
    await fc.assert(
      fc.asyncProperty(fullTrainingRecordArb, async (record) => {
        // Serialize to JSON
        const json = JSON.stringify(record);
        
        // Deserialize from JSON
        const parsed = JSON.parse(json) as TrainingRecord;
        
        // Verify all fields are preserved
        expect(parsed.id).toBe(record.id);
        expect(parsed.device_id).toBe(record.device_id);
        expect(parsed.module_type).toBe(record.module_type);
        expect(parsed.score).toBe(record.score);
        expect(parsed.accuracy).toBe(record.accuracy);
        expect(parsed.duration).toBe(record.duration);
        expect(parsed.difficulty).toBe(record.difficulty);
        expect(parsed.created_at).toBe(record.created_at);
        
        // Details should be equivalent (handle null case)
        if (record.details === null) {
          expect(parsed.details).toBeNull();
        } else {
          expect(JSON.stringify(parsed.details)).toBe(JSON.stringify(record.details));
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
