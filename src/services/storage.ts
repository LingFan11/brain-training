/**
 * StorageService - 存储服务
 * 实现云端存储和本地缓存，支持离线同步
 * 
 * Requirements: 1.1.3, 1.1.4, 1.1.5, 10.1, 10.5
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TrainingRecord, TrainingModuleType } from '@/lib/database.types';
import { getDeviceId } from './device';

const LOCAL_CACHE_KEY = 'cognitive_training_local_cache';
const PENDING_SYNC_KEY = 'cognitive_training_pending_sync';

export interface TrainingStats {
  totalSessions: number;
  totalDuration: number;
  streakDays: number;
  moduleStats: Record<TrainingModuleType, ModuleStats>;
}

export interface ModuleStats {
  sessions: number;
  avgScore: number;
  avgAccuracy: number;
  bestScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface NewTrainingRecord {
  moduleType: TrainingModuleType;
  score: number;
  accuracy: number;
  duration: number;
  difficulty: number;
  details?: Record<string, unknown>;
}

/**
 * 保存训练记录
 * 优先保存到云端，失败时缓存到本地
 */
export async function saveRecord(record: NewTrainingRecord): Promise<TrainingRecord> {
  const deviceId = await getDeviceId();
  
  const newRecord = {
    device_id: deviceId,
    module_type: record.moduleType,
    score: record.score,
    accuracy: record.accuracy,
    duration: record.duration,
    difficulty: record.difficulty,
    details: record.details || null,
  };

  // 尝试保存到云端
  if (isSupabaseConfigured() && supabase) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('training_records')
        .insert(newRecord)
        .select()
        .single();

      if (error) throw error;
      
      // 同时更新本地缓存
      addToLocalCache(data as TrainingRecord);
      
      return data as TrainingRecord;
    } catch (error) {
      console.warn('Failed to save to cloud, caching locally:', error);
      return saveToLocalCacheOnly(newRecord);
    }
  }

  // 云端不可用，保存到本地
  return saveToLocalCacheOnly(newRecord);
}

/**
 * 获取训练记录
 */
export async function getRecords(
  moduleType?: TrainingModuleType,
  limit?: number
): Promise<TrainingRecord[]> {
  const deviceId = await getDeviceId();
  
  // 尝试从云端获取
  if (isSupabaseConfigured() && supabase) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('training_records')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });

      if (moduleType) {
        query = query.eq('module_type', moduleType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // 更新本地缓存
      if (data) {
        updateLocalCache(data as TrainingRecord[]);
      }
      
      return (data || []) as TrainingRecord[];
    } catch (error) {
      console.warn('Failed to fetch from cloud, using local cache:', error);
      return getFromLocalCache(moduleType, limit);
    }
  }

  // 云端不可用，从本地获取
  return getFromLocalCache(moduleType, limit);
}

/**
 * 获取统计数据
 */
export async function getStats(): Promise<TrainingStats> {
  const records = await getRecords();
  return calculateStats(records);
}

/**
 * 同步本地缓存到云端
 */
export async function syncLocalCache(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const pendingRecords = getPendingSyncRecords();
  
  if (pendingRecords.length === 0) {
    return;
  }

  const successfulIds: string[] = [];

  for (const record of pendingRecords) {
    try {
      const insertData = {
        device_id: record.device_id,
        module_type: record.module_type,
        score: record.score,
        accuracy: record.accuracy,
        duration: record.duration,
        difficulty: record.difficulty,
        details: record.details,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('training_records')
        .insert(insertData);

      if (!error) {
        successfulIds.push(record.id);
      }
    } catch (error) {
      console.warn('Failed to sync record:', error);
    }
  }

  // 移除已同步的记录
  removePendingSyncRecords(successfulIds);
}

// ============ 本地缓存辅助函数 ============

function getLocalCache(): TrainingRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function setLocalCache(records: TrainingRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(records));
}

function addToLocalCache(record: TrainingRecord): void {
  const cache = getLocalCache();
  // 避免重复
  const exists = cache.some(r => r.id === record.id);
  if (!exists) {
    cache.unshift(record);
    setLocalCache(cache);
  }
}

function updateLocalCache(records: TrainingRecord[]): void {
  setLocalCache(records);
}

function getFromLocalCache(
  moduleType?: TrainingModuleType,
  limit?: number
): TrainingRecord[] {
  let records = getLocalCache();
  
  if (moduleType) {
    records = records.filter(r => r.module_type === moduleType);
  }
  
  if (limit) {
    records = records.slice(0, limit);
  }
  
  return records;
}

function saveToLocalCacheOnly(
  record: Omit<TrainingRecord, 'id' | 'created_at'>
): TrainingRecord {
  const fullRecord: TrainingRecord = {
    ...record,
    id: generateLocalId(),
    created_at: new Date().toISOString(),
  };
  
  addToLocalCache(fullRecord);
  addToPendingSync(fullRecord);
  
  return fullRecord;
}

function generateLocalId(): string {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(7);
}

// ============ 待同步队列辅助函数 ============

function getPendingSyncRecords(): TrainingRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const pending = localStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
}

function addToPendingSync(record: TrainingRecord): void {
  if (typeof window === 'undefined') return;
  
  const pending = getPendingSyncRecords();
  pending.push(record);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

function removePendingSyncRecords(ids: string[]): void {
  if (typeof window === 'undefined') return;
  
  const pending = getPendingSyncRecords();
  const remaining = pending.filter(r => !ids.includes(r.id));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
}

// ============ 统计计算辅助函数 ============

function calculateStats(records: TrainingRecord[]): TrainingStats {
  const moduleTypes: TrainingModuleType[] = [
    'schulte', 'stroop', 'sequence', 'auditory', 
    'bilateral', 'classification', 'scene'
  ];

  const moduleStats: Record<TrainingModuleType, ModuleStats> = {} as Record<TrainingModuleType, ModuleStats>;
  
  for (const type of moduleTypes) {
    const moduleRecords = records.filter(r => r.module_type === type);
    moduleStats[type] = calculateModuleStats(moduleRecords);
  }

  return {
    totalSessions: records.length,
    totalDuration: records.reduce((sum, r) => sum + r.duration, 0),
    streakDays: calculateStreakDays(records),
    moduleStats,
  };
}

function calculateModuleStats(records: TrainingRecord[]): ModuleStats {
  if (records.length === 0) {
    return {
      sessions: 0,
      avgScore: 0,
      avgAccuracy: 0,
      bestScore: 0,
      trend: 'stable',
    };
  }

  const scores = records.map(r => r.score);
  const accuracies = records.map(r => r.accuracy);

  return {
    sessions: records.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    avgAccuracy: Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length * 100) / 100,
    bestScore: Math.max(...scores),
    trend: calculateTrend(records),
  };
}

function calculateTrend(records: TrainingRecord[]): 'improving' | 'stable' | 'declining' {
  if (records.length < 3) return 'stable';
  
  // 比较最近3次和之前3次的平均分
  const recent = records.slice(0, 3);
  const previous = records.slice(3, 6);
  
  if (previous.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
  const previousAvg = previous.reduce((sum, r) => sum + r.score, 0) / previous.length;
  
  const diff = recentAvg - previousAvg;
  const threshold = previousAvg * 0.1; // 10% 变化阈值
  
  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'stable';
}

function calculateStreakDays(records: TrainingRecord[]): number {
  if (records.length === 0) return 0;
  
  // 获取所有训练日期（去重）
  const dateSet = new Set(
    records.map(r => new Date(r.created_at).toDateString())
  );
  const dates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (dates.length === 0) return 0;
  
  // 检查今天是否有训练
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0; // 连续训练已中断
  }
  
  let streak = 1;
  let currentDate = new Date(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate.getTime() - 86400000);
    if (new Date(dates[i]).toDateString() === prevDate.toDateString()) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

// ============ 导出用于测试的辅助函数 ============

export const _testHelpers = {
  getLocalCache,
  setLocalCache,
  getPendingSyncRecords,
  calculateStats,
  LOCAL_CACHE_KEY,
  PENDING_SYNC_KEY,
};
