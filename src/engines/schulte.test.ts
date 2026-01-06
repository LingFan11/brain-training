/**
 * SchulteEngine Property Tests
 * 
 * Property 4: Schulte Grid Generation
 * Property 5: Schulte Tap Response
 * Property 6: Schulte Completion Stats
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * **Feature: cognitive-training-platform**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  SchulteEngine,
  generateGrid,
  validateGrid,
  type GridSize,
} from './schulte';

// Arbitrary for valid grid sizes
const gridSizeArb = fc.constantFrom(3, 4, 5, 6) as fc.Arbitrary<GridSize>;

describe('SchulteEngine', () => {
  /**
   * Property 4: Schulte Grid Generation
   * For any valid grid size (3, 4, 5, or 6), generating a Schulte grid should 
   * produce a grid containing exactly all numbers from 1 to n² with no duplicates.
   * 
   * **Validates: Requirements 2.1, 2.5**
   */
  it('Property 4: Schulte Grid Generation - grid should contain all numbers 1 to n² with no duplicates', () => {
    fc.assert(
      fc.property(gridSizeArb, (size) => {
        const grid = generateGrid(size);
        const totalNumbers = size * size;
        
        // Grid should have correct dimensions
        expect(grid.length).toBe(size);
        for (const row of grid) {
          expect(row.length).toBe(size);
        }
        
        // Flatten grid and check contents
        const flatGrid = grid.flat();
        expect(flatGrid.length).toBe(totalNumbers);
        
        // Should contain all numbers from 1 to n²
        const sortedNumbers = [...flatGrid].sort((a, b) => a - b);
        for (let i = 0; i < totalNumbers; i++) {
          expect(sortedNumbers[i]).toBe(i + 1);
        }
        
        // No duplicates (verified by the above check)
        const uniqueNumbers = new Set(flatGrid);
        expect(uniqueNumbers.size).toBe(totalNumbers);
        
        // Validate using helper function
        expect(validateGrid(grid, size)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Schulte Tap Response
   * For any Schulte game state, tapping the current target number should advance 
   * the target by 1 and increment correct count, while tapping any other number 
   * should increment error count without advancing.
   * 
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 5: Schulte Tap Response - correct tap advances target, incorrect tap increments error', () => {
    fc.assert(
      fc.property(
        gridSizeArb,
        fc.integer({ min: 1, max: 36 }), // tap number (max for 6x6 grid)
        (size, tapNumber) => {
          const engine = new SchulteEngine({ gridSize: size });
          engine.start();
          
          const totalNumbers = size * size;
          const currentTarget = engine.getCurrentTarget();
          
          // Ensure tap number is within valid range for this grid
          const validTapNumber = ((tapNumber - 1) % totalNumbers) + 1;
          
          const stateBefore = engine.getState();
          const isCorrect = engine.tap(validTapNumber);
          const stateAfter = engine.getState();
          
          if (validTapNumber === currentTarget) {
            // Correct tap
            expect(isCorrect).toBe(true);
            expect(stateAfter.correctCount).toBe(stateBefore.correctCount + 1);
            expect(stateAfter.errorCount).toBe(stateBefore.errorCount);
            
            // Target should advance (unless completed)
            if (currentTarget < totalNumbers) {
              expect(stateAfter.currentTarget).toBe(currentTarget + 1);
            }
          } else {
            // Incorrect tap
            expect(isCorrect).toBe(false);
            expect(stateAfter.errorCount).toBe(stateBefore.errorCount + 1);
            expect(stateAfter.correctCount).toBe(stateBefore.correctCount);
            expect(stateAfter.currentTarget).toBe(currentTarget); // Target unchanged
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Schulte Completion Stats
   * For any completed Schulte session, the result should contain valid score, 
   * accuracy (correctCount / totalTaps), and positive duration.
   * 
   * **Validates: Requirements 2.4**
   */
  it('Property 6: Schulte Completion Stats - completed session has valid stats', () => {
    fc.assert(
      fc.property(
        gridSizeArb,
        fc.array(fc.boolean(), { minLength: 0, maxLength: 10 }), // random errors
        (size, errorPattern) => {
          const engine = new SchulteEngine({ gridSize: size });
          engine.start();
          
          const totalNumbers = size * size;
          let errorCount = 0;
          
          // Complete the grid, optionally making some errors
          for (let target = 1; target <= totalNumbers; target++) {
            // Optionally make an error before correct tap
            if (errorPattern[target % errorPattern.length]) {
              // Tap wrong number (any number that's not the target)
              const wrongNumber = target === 1 ? 2 : 1;
              engine.tap(wrongNumber);
              errorCount++;
            }
            
            // Tap correct number
            engine.tap(target);
          }
          
          // Session should be complete
          expect(engine.isComplete()).toBe(true);
          
          // Calculate result
          const result = engine.calculateResult();
          
          // Verify result properties
          expect(result.gridSize).toBe(size);
          expect(result.correctCount).toBe(totalNumbers);
          expect(result.errorCount).toBe(errorCount);
          expect(result.totalTaps).toBe(totalNumbers + errorCount);
          
          // Accuracy should be correctCount / totalTaps (rounded to 2 decimal places)
          const expectedAccuracy = totalNumbers / (totalNumbers + errorCount);
          // Use tolerance of 0.01 to account for rounding in implementation
          expect(Math.abs(result.accuracy - expectedAccuracy)).toBeLessThanOrEqual(0.01);
          
          // Duration should be positive (or 0 if very fast)
          expect(result.duration).toBeGreaterThanOrEqual(0);
          
          // Score should be non-negative
          expect(result.score).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Engine reset functionality
   */
  it('reset should create a new grid and reset all counters', () => {
    const engine = new SchulteEngine({ gridSize: 4 });
    engine.start();
    
    // Make some taps
    engine.tap(1);
    engine.tap(2);
    engine.tap(5); // error
    
    const gridBefore = engine.getGrid();
    
    // Reset
    engine.reset();
    
    const stateAfter = engine.getState();
    const gridAfter = engine.getGrid();
    
    // State should be reset
    expect(stateAfter.currentTarget).toBe(1);
    expect(stateAfter.correctCount).toBe(0);
    expect(stateAfter.errorCount).toBe(0);
    expect(stateAfter.isComplete).toBe(false);
    expect(stateAfter.startTime).toBeNull();
    expect(stateAfter.tapHistory).toHaveLength(0);
    
    // Grid should be different (with high probability)
    // Note: There's a tiny chance the same grid is generated
    const gridBeforeFlat = gridBefore.flat().join(',');
    const gridAfterFlat = gridAfter.flat().join(',');
    // We don't assert they're different since it's probabilistic
    // Just verify the new grid is valid
    expect(validateGrid(gridAfter, 4)).toBe(true);
  });

  /**
   * Additional test: setGridSize changes grid size and resets
   */
  it('setGridSize should change grid size and reset state', () => {
    const engine = new SchulteEngine({ gridSize: 3 });
    
    // Make some progress
    engine.start();
    engine.tap(1);
    
    // Change grid size
    engine.setGridSize(5);
    
    const state = engine.getState();
    const config = engine.getConfig();
    
    // Config should be updated
    expect(config.gridSize).toBe(5);
    
    // State should be reset
    expect(state.currentTarget).toBe(1);
    expect(state.correctCount).toBe(0);
    expect(state.grid.length).toBe(5);
    expect(state.grid[0].length).toBe(5);
    
    // Grid should be valid for new size
    expect(validateGrid(state.grid, 5)).toBe(true);
  });

  /**
   * Additional test: Taps after completion are ignored
   */
  it('taps after completion should be ignored', () => {
    const engine = new SchulteEngine({ gridSize: 3 });
    engine.start();
    
    // Complete the grid
    for (let i = 1; i <= 9; i++) {
      engine.tap(i);
    }
    
    expect(engine.isComplete()).toBe(true);
    
    const stateBefore = engine.getState();
    
    // Try to tap after completion
    const result = engine.tap(1);
    
    expect(result).toBe(false);
    
    const stateAfter = engine.getState();
    
    // State should be unchanged
    expect(stateAfter.correctCount).toBe(stateBefore.correctCount);
    expect(stateAfter.errorCount).toBe(stateBefore.errorCount);
    expect(stateAfter.tapHistory.length).toBe(stateBefore.tapHistory.length);
  });
});
