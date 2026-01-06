/**
 * DeviceService Property Tests
 * 
 * Property 1: Device ID Persistence
 * For any user session, generating a device ID and then retrieving it should 
 * return the same non-empty string, and the ID should be stored in localStorage.
 * 
 * **Validates: Requirements 1.1.1, 1.1.2**
 * **Feature: cognitive-training-platform, Property 1: Device ID Persistence**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { getDeviceId, hasDeviceId, clearDeviceId, STORAGE_KEY } from './device';

// Mock FingerprintJS
vi.mock('@fingerprintjs/fingerprintjs', () => ({
  default: {
    load: vi.fn(() => Promise.resolve({
      get: vi.fn(() => Promise.resolve({
        visitorId: 'mock-fingerprint-' + Math.random().toString(36).substring(7)
      }))
    }))
  },
  Agent: class {}
}));

describe('DeviceService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearDeviceId();
  });

  /**
   * Property 1: Device ID Persistence
   * For any user session, generating a device ID and then retrieving it should 
   * return the same non-empty string, and the ID should be stored in localStorage.
   * 
   * **Validates: Requirements 1.1.1, 1.1.2**
   */
  it('Property 1: Device ID Persistence - generated ID should be retrievable and stored in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Clear state for each iteration
        localStorage.clear();
        
        // Initially, no device ID should exist
        expect(hasDeviceId()).toBe(false);
        
        // Generate device ID
        const deviceId1 = await getDeviceId();
        
        // Device ID should be non-empty string
        expect(typeof deviceId1).toBe('string');
        expect(deviceId1.length).toBeGreaterThan(0);
        
        // Device ID should now exist
        expect(hasDeviceId()).toBe(true);
        
        // Device ID should be stored in localStorage
        const storedId = localStorage.getItem(STORAGE_KEY);
        expect(storedId).toBe(deviceId1);
        
        // Retrieving again should return the same ID
        const deviceId2 = await getDeviceId();
        expect(deviceId2).toBe(deviceId1);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: hasDeviceId returns correct state
   */
  it('hasDeviceId should return false when no ID exists and true after ID is generated', async () => {
    expect(hasDeviceId()).toBe(false);
    
    await getDeviceId();
    
    expect(hasDeviceId()).toBe(true);
  });

  /**
   * Additional test: clearDeviceId removes the stored ID
   */
  it('clearDeviceId should remove the stored device ID', async () => {
    await getDeviceId();
    expect(hasDeviceId()).toBe(true);
    
    clearDeviceId();
    expect(hasDeviceId()).toBe(false);
  });
});
