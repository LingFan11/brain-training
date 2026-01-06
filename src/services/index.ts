/**
 * Services barrel export
 */

export { getDeviceId, hasDeviceId, clearDeviceId, STORAGE_KEY } from './device';
export { 
  saveRecord, 
  getRecords, 
  getStats, 
  syncLocalCache,
  _testHelpers as storageTestHelpers,
  type TrainingStats,
  type ModuleStats,
  type NewTrainingRecord,
} from './storage';
export {
  generateFeedback,
  generateRecommendation,
  suggestDifficulty,
  isAIConfigured,
  clearAICache,
  _testHelpers as aiTestHelpers,
} from './ai';
