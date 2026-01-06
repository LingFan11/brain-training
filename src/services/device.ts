/**
 * DeviceService - 设备识别服务
 * 使用 FingerprintJS 生成设备指纹，用于关联用户数据
 * 
 * Requirements: 1.1.1, 1.1.2
 */

import FingerprintJS, { Agent } from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'cognitive_training_device_id';

// 缓存 FingerprintJS 实例
let fpPromise: Promise<Agent> | null = null;

/**
 * 获取 FingerprintJS 实例（单例模式）
 */
function getFingerprintAgent(): Promise<Agent> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

/**
 * 检查设备ID是否已存在于 localStorage
 */
export function hasDeviceId(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  return deviceId !== null && deviceId.length > 0;
}

/**
 * 获取或生成设备ID
 * 如果 localStorage 中已存在，直接返回
 * 否则使用 FingerprintJS 生成新的设备指纹
 */
export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('DeviceService can only be used in browser environment');
  }

  // 先检查 localStorage 中是否已有设备ID
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId && existingId.length > 0) {
    return existingId;
  }

  // 使用 FingerprintJS 生成设备指纹
  try {
    const fp = await getFingerprintAgent();
    const result = await fp.get();
    const deviceId = result.visitorId;

    // 存储到 localStorage
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  } catch {
    // 如果 FingerprintJS 失败，生成随机 UUID 作为备用
    const fallbackId = generateFallbackId();
    localStorage.setItem(DEVICE_ID_KEY, fallbackId);
    return fallbackId;
  }
}

/**
 * 生成备用设备ID（当 FingerprintJS 失败时使用）
 */
function generateFallbackId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 清除设备ID（仅用于测试）
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}

// 导出常量供测试使用
export const STORAGE_KEY = DEVICE_ID_KEY;
