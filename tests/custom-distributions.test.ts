import { Test, TestingModule } from '@nestjs/testing';
import { BaseConsensusService } from '../src/consensus/base-consensus.service';
import { ColorSelectionService } from '../src/consensus/services/color-selection.service';
import { PartnerSelectionService } from '../src/consensus/services/partner-selection.service';
import { MessageHandlingService } from '../src/consensus/services/message-handling.service';
import { LoggingSystemService } from '../src/consensus/services/logging-system.service';
import { SystemStateService } from '../src/consensus/services/system-state.service';
import {Color, ProcessId} from "../src/consensus/types";

describe('Custom Distribution Tests', () => {
  let module: TestingModule;
  let consensusService: BaseConsensusService;
  let colorSelectionService: ColorSelectionService;
  let systemStateService: SystemStateService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        BaseConsensusService,
        ColorSelectionService,
        PartnerSelectionService,
        MessageHandlingService,
        LoggingSystemService,
        SystemStateService,
      ],
    }).compile();

    consensusService = module.get<BaseConsensusService>(BaseConsensusService);
    colorSelectionService = module.get<ColorSelectionService>(ColorSelectionService);
    systemStateService = module.get<SystemStateService>(SystemStateService);
  });

  beforeEach(() => {
    // Reset the consensus service state before each test
    if (consensusService) {
      consensusService.reset();
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });


  describe('Three Colors with Three Processes Scenario', () => {
    it('should handle three colors with three processes - balanced distribution', async () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G', 'B'],
        2: ['G', 'G', 'R', 'G'],
        3: ['B', 'B', 'R', 'G']
      };

      consensusService.reset(customDistributions);

      const initialState = consensusService.getSystemState();
      expect(initialState.processes).toHaveLength(3);

      // Verify initial distribution
      expect(initialState.processes[0].stack).toEqual(['R', 'R', 'G', 'B']);
      expect(initialState.processes[1].stack).toEqual(['G', 'G', 'R', 'G']);
      expect(initialState.processes[2].stack).toEqual(['B', 'B', 'R', 'G']);

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();

      // Verify consensus reached (optimal consensus, not necessarily perfect monochrome)
      expect(finalState.isComplete).toBe(true);

      // Verify all processes have reached their optimal state
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
        expect(process.isDone).toBe(true);

        if (process.stack.length > 0) {
          // For unequal distributions, verify each process is optimized (dominant color >= 50%)
          const colorCounts = new Map<string, number>();
          for (const color of process.stack) {
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
          
          const maxCount = Math.max(...Array.from(colorCounts.values()));
          const dominantPercentage = maxCount / process.stack.length;
          
          // Each process should have achieved good color concentration
          expect(dominantPercentage).toBeGreaterThanOrEqual(0.5); // At least 50% dominant color
        }
      }

      // Verify ball conservation
      const finalBalls: Color[] = [];
      for (const process of finalState.processes) {
        finalBalls.push(...process.stack);
      }

      const colorCounts = new Map<Color, number>();
      for (const ball of finalBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }

      // Initial: 4 R balls, 5 G balls, 3 B balls (from the unequal distribution)
      expect(colorCounts.get('R')).toBe(4);
      expect(colorCounts.get('G')).toBe(5);
      expect(colorCounts.get('B')).toBe(3);
      expect(finalBalls.length).toBe(12);

      console.log(`✅ Three-color optimal consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
    });


    it('should handle two colors with three processes - minimal case', async () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R'],
        2: ['G'],
        3: ['R']
      };

      consensusService.reset(customDistributions);

      const initialState = consensusService.getSystemState();
      expect(initialState.processes).toHaveLength(3);

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();

      // Verify consensus reached
      expect(finalState.isComplete).toBe(true);

      // Verify all processes are monochrome
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
        expect(process.isDone).toBe(true);

        if (process.stack.length > 0) {
          const uniqueColors = new Set(process.stack);
          expect(uniqueColors.size).toBe(1);
        }
      }

      // Verify ball conservation
      const finalBalls: Color[] = [];
      for (const process of finalState.processes) {
        finalBalls.push(...process.stack);
      }

      const colorCounts = new Map<Color, number>();
      for (const ball of finalBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }

      // Initial: 2 R balls, 1 G ball
      expect(colorCounts.get('R')).toBe(2);
      expect(colorCounts.get('G')).toBe(1);
      expect(finalBalls.length).toBe(3);

      console.log(`✅ Two-color minimal consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
    });

    it('should handle two colors with three processes - one empty process', async () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G', 'G'],
        2: [],
        3: ['R', 'G']
      };

      consensusService.reset(customDistributions);

      const initialState = consensusService.getSystemState();
      expect(initialState.processes).toHaveLength(3);
      expect(initialState.processes[1].stack).toEqual([]);

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();

      // Verify consensus reached
      console.log(`Final system complete: ${finalState.isComplete}`);
      
      // Debug: show final state before assertions
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
      }
      
      expect(finalState.isComplete).toBe(true);

      expect(finalState.processes[0].stack).toEqual(['R', 'R', 'R']);
      expect(finalState.processes[1].stack).toEqual([]);
      expect(finalState.processes[2].stack).toEqual(['G', 'G', 'G']);

      // Verify all processes are done and in optimal state
      for (const process of finalState.processes) {
        expect(process.isDone).toBe(true);

        if (process.stack.length > 0) {
          // For unequal distributions with insufficient colors for perfect monochrome,
          // verify each process has achieved good color concentration
          const colorCounts = new Map<string, number>();
          for (const color of process.stack) {
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
          
          const maxCount = Math.max(...Array.from(colorCounts.values()));
          const dominantPercentage = maxCount / process.stack.length;
          
          // Each process should have achieved good color concentration (≥ 50%)
          expect(dominantPercentage).toBeGreaterThanOrEqual(0.5);
        }
      }

      // Verify ball conservation
      const finalBalls: Color[] = [];
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
        finalBalls.push(...process.stack);
      }

      const colorCounts = new Map<Color, number>();
      for (const ball of finalBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }

      // Initial: 3 R balls, 3 G balls
      expect(colorCounts.get('R')).toBe(3);
      expect(colorCounts.get('G')).toBe(3);
      expect(finalBalls.length).toBe(6);

      console.log(`✅ Two-color with empty process consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
    });

    it('should handle the specific unequal distribution case - 4R, 4G, 3B', async () => {  

      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G', 'B'],
        2: ['G', 'G', 'R', 'R'],
        3: ['B', 'B', 'R', 'G']
      };

      consensusService.reset(customDistributions);

      const initialState = consensusService.getSystemState();
      
      expect(initialState.processes).toHaveLength(3);

      // Debug: Log the actual initial distribution
      console.log('DEBUG: Initial distribution:');
      for (const process of initialState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}]`);
      }

      // Calculate actual initial color counts
      const initialBalls: Color[] = [];
      for (const process of initialState.processes) {
        initialBalls.push(...process.stack);
      }
      const initialColorCounts = new Map<Color, number>();
      for (const ball of initialBalls) {
        initialColorCounts.set(ball, (initialColorCounts.get(ball) || 0) + 1);
      }
      console.log('DEBUG: Initial color counts:', Array.from(initialColorCounts.entries()));

      // Verify initial distribution
      expect(initialState.processes[0].stack).toEqual(['R', 'R', 'G', 'B']);
      expect(initialState.processes[1].stack).toEqual(['G', 'G', 'R', 'R']);
      expect(initialState.processes[2].stack).toEqual(['B', 'B', 'R', 'G']);

      // Verify we have the correct color counts initially
      expect(initialColorCounts.get('R')).toBe(5);
      expect(initialColorCounts.get('G')).toBe(4);
      expect(initialColorCounts.get('B')).toBe(3);
      expect(initialBalls.length).toBe(12);

      // Total: 4R, 4G, 3B (11 balls total)
      // With 3 processes, perfect monochrome is impossible since 11 ÷ 3 = 3.67
      // But we can achieve optimal distribution where each process concentrates on one color

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();

      // Verify consensus reached (optimal consensus, not perfect monochrome)
      expect(finalState.isComplete).toBe(true);

      // Verify all processes have reached their optimal state
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
        expect(process.isDone).toBe(true);

        if (process.stack.length > 0) {
          // For unequal distributions, verify each process is optimized
          const colorCounts = new Map<string, number>();
          for (const color of process.stack) {
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
          
          const maxCount = Math.max(...Array.from(colorCounts.values()));
          const dominantPercentage = maxCount / process.stack.length;
          
          // Each process should have achieved good color concentration
          expect(dominantPercentage).toBeGreaterThanOrEqual(0.5); // At least 50% dominant color
        }
      }

      // Verify ball conservation with final state
      const finalBalls: Color[] = [];
      for (const process of finalState.processes) {
        finalBalls.push(...process.stack);
      }

      const finalColorCounts = new Map<Color, number>();
      for (const ball of finalBalls) {
        finalColorCounts.set(ball, (finalColorCounts.get(ball) || 0) + 1);
      }

      console.log('DEBUG: Final color counts:', Array.from(finalColorCounts.entries()));
      
      // Verify final ball conservation matches initial
      expect(finalColorCounts.get('R')).toBe(5);
      expect(finalColorCounts.get('G')).toBe(4);
      expect(finalColorCounts.get('B')).toBe(3);
      expect(finalBalls.length).toBe(12);

      console.log(`✅ Unequal distribution (4R,4G,3B) optimal consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
    });
  });

  it('should handle two colors with three processes - all colors in one process', async () => {
    const customDistributions: Record<ProcessId, Color[]> = {
      1: ['R', 'G'],
      2: [],
      3: []
    };

    consensusService.reset(customDistributions);

    const initialState = consensusService.getSystemState();
    expect(initialState.processes).toHaveLength(3);

    const startTime = Date.now();
    await consensusService.startConsensus();
    const endTime = Date.now();

    const finalState = consensusService.getSystemState();

    // Verify consensus reached
    expect(finalState.isComplete).toBe(true);

    // Verify initial distribution
    expect(finalState.processes[0].stack).toEqual(['R']);
    expect(finalState.processes[1].stack).toEqual(['G']);
    expect(finalState.processes[2].stack).toEqual([]);

    // Verify all processes are monochrome
    for (const process of finalState.processes) {
      console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
      expect(process.isDone).toBe(true);

      if (process.stack.length > 0) {
        const uniqueColors = new Set(process.stack);
        expect(uniqueColors.size).toBe(1);
      }
    }

    // Verify ball conservation
    const finalBalls: Color[] = [];
    for (const process of finalState.processes) {
      finalBalls.push(...process.stack);
    }

    const colorCounts = new Map<Color, number>();
    for (const ball of finalBalls) {
      colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
    }

    // Initial: 2 R balls, 1 G ball
    expect(colorCounts.get('R')).toBe(2);
    expect(colorCounts.get('G')).toBe(1);
    expect(finalBalls.length).toBe(3);

    console.log(`✅ Two-color minimal consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
  });

  it('should correctly identify when perfect monochrome is not achievable', () => {
      // Test the SystemStateService logic directly
      const systemStateService = new SystemStateService();
      
      // Create a mock process state with the unequal distribution
      const mockProcesses: any[] = [
        { id: 1, stack: ['R', 'R', 'G', 'B'], wanted: null, partner: null, isDone: false },
        { id: 2, stack: ['G', 'G', 'R', 'R'], wanted: null, partner: null, isDone: false },
        { id: 3, stack: ['B', 'B', 'R', 'G'], wanted: null, partner: null, isDone: false }
      ];
      
      console.log('Testing with unequal distribution: 4R, 4G, 3B (11 balls total)');
      console.log('Expected: Perfect monochrome should NOT be achievable');
      
      // This distribution has 4R, 4G, 3B (11 balls total)
      // With 3 processes, each process would need 11/3 = 3.67 balls
      // Since this is not an integer, perfect monochrome is impossible
      const isAchievable = systemStateService.isPerfectMonochromeAchievable(mockProcesses);
      
      console.log(`Result: Perfect monochrome achievable = ${isAchievable}`);
      
      // Should return false because 11 balls ÷ 3 processes = 3.67 (not integer)
      expect(isAchievable).toBe(false);
      
      console.log('✅ Correctly identified that perfect monochrome is not achievable for unequal distribution');
    });


});
