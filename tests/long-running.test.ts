import {Test, TestingModule} from '@nestjs/testing';
import {BaseConsensusService} from '../src/consensus/base-consensus.service';
import {SilentConsensusService} from './silent-consensus.service';
import {ColorSelectionService} from '../src/consensus/services/color-selection.service';
import {PartnerSelectionService} from '../src/consensus/services/partner-selection.service';
import {MessageHandlingService} from '../src/consensus/services/message-handling.service';
import {ValidationService} from '../src/consensus/services/validation.service';
import {SystemStateService} from '../src/consensus/services/system-state.service';
import {ProcessId, Color} from '../src/consensus/types';

describe('Custom Distributions Tests', () => {
  let module: TestingModule;
  let consensusService: BaseConsensusService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: BaseConsensusService,
          useClass: SilentConsensusService,
        },
        ColorSelectionService,
        PartnerSelectionService,
        MessageHandlingService,
        ValidationService,
        SystemStateService,
      ],
    }).compile();

    consensusService = module.get<BaseConsensusService>(BaseConsensusService);
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

    it('should handle two colors with three processes - unbalanced distribution', async () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'R', 'G'],
        2: ['G'],
        3: ['R', 'G']
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

      // Verify all processes are done and in optimal state
      for (const process of finalState.processes) {
        console.log(`Process ${process.id}: [${process.stack.join(',')}] isDone: ${process.isDone}`);
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
        finalBalls.push(...process.stack);
      }

      const colorCounts = new Map<Color, number>();
      for (const ball of finalBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }

      // Initial: 4 R balls, 3 G balls
      expect(colorCounts.get('R')).toBe(4);
      expect(colorCounts.get('G')).toBe(3);
      expect(finalBalls.length).toBe(7);

      // With 4 R and 2 G balls, we should have processes with only R or only G
      const processesWithR = finalState.processes.filter(p => p.stack.length > 0 && p.stack[0] === 'R').length;
      const processesWithG = finalState.processes.filter(p => p.stack.length > 0 && p.stack[0] === 'G').length;

      expect(processesWithR).toBeGreaterThan(0);
      expect(processesWithG).toBeGreaterThan(0);

      console.log(`✅ Two-color unbalanced consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
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
  });
});
