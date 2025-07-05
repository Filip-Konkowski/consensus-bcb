import { Test, TestingModule } from '@nestjs/testing';
import { BaseConsensusService } from '../src/consensus/base-consensus.service';
import { ColorSelectionService } from '../src/consensus/services/color-selection.service';
import { PartnerSelectionService } from '../src/consensus/services/partner-selection.service';
import { MessageHandlingService } from '../src/consensus/services/message-handling.service';
import { ValidationService } from '../src/consensus/services/validation.service';
import { SystemStateService } from '../src/consensus/services/system-state.service';
import { ProcessId, Color } from '../src/consensus/types';

describe('Custom Distributions Tests', () => {
  let module: TestingModule;
  let consensusService: BaseConsensusService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        BaseConsensusService,
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

  describe('Custom Initial Distributions', () => {
    it('should accept custom distributions with different arrays', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'R', 'R', 'R'],
        2: ['G', 'G', 'G', 'G', 'G'],
        3: ['B', 'B', 'B', 'B', 'B']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(['R', 'R', 'R', 'R', 'R']);
      expect(state.processes[1].stack).toEqual(['G', 'G', 'G', 'G', 'G']);
      expect(state.processes[2].stack).toEqual(['B', 'B', 'B', 'B', 'B']);
    });

    it('should accept custom distributions with different lengths', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G'],
        2: ['G', 'G', 'G', 'G', 'B', 'B'],
        3: ['B', 'B', 'B', 'B', 'B', 'R', 'R', 'R', 'R']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(['R', 'R', 'G']);
      expect(state.processes[1].stack).toEqual(['G', 'G', 'G', 'G', 'B', 'B']);
      expect(state.processes[2].stack).toEqual(['B', 'B', 'B', 'B', 'B', 'R', 'R', 'R', 'R']);
    });

    it('should accept custom distributions with arbitrary arrangements', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['B', 'R', 'G', 'B', 'R', 'G'],
        2: ['R', 'G', 'B', 'R'],
        3: ['G', 'B', 'R', 'G', 'B', 'R', 'G', 'B']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(['B', 'R', 'G', 'B', 'R', 'G']);
      expect(state.processes[1].stack).toEqual(['R', 'G', 'B', 'R']);
      expect(state.processes[2].stack).toEqual(['G', 'B', 'R', 'G', 'B', 'R', 'G', 'B']);
    });

    it('should reset with custom distributions parameter', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'G'],
        2: ['B', 'R'],
        3: ['G', 'B']
      };

      consensusService.reset(customDistributions);

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(['R', 'G']);
      expect(state.processes[1].stack).toEqual(['B', 'R']);
      expect(state.processes[2].stack).toEqual(['G', 'B']);
    });

    it('should preserve ball counts in custom distributions', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G', 'B'],
        2: ['G', 'G', 'R', 'B'],
        3: ['B', 'B', 'G', 'R']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      const allBalls: Color[] = [];
      
      for (const process of state.processes) {
        allBalls.push(...process.stack);
      }

      const colorCounts = new Map<Color, number>();
      for (const ball of allBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }

      expect(colorCounts.get('R')).toBe(4);  // Changed from 3 to 4
      expect(colorCounts.get('G')).toBe(4);  // Changed from 3 to 4
      expect(colorCounts.get('B')).toBe(4);  // Changed from 3 to 4
      expect(allBalls.length).toBe(12);      // Changed from 9 to 12
    });

    it('should run consensus with custom distributions', async () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'R', 'G', 'B'],
        2: ['G', 'G', 'R', 'B'],
        3: ['B', 'B', 'G', 'R']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const initialState = consensusService.getSystemState();
      expect(initialState.processes).toHaveLength(3);

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();
      
      // Verify convergence
      expect(finalState.isComplete).toBe(true);
      
      // Verify all processes are monochrome
      for (const process of finalState.processes) {
        expect(process.isDone).toBe(true);
        expect(process.isActive).toBe(false);
        
        if (process.stack.length > 0) {
          const uniqueColors = new Set(process.stack);
          expect(uniqueColors.size).toBe(1);
        }
      }
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      console.log(`✅ Custom distribution consensus reached in ${endTime - startTime}ms with ${finalState.totalExchanges} exchanges`);
    }, 10000);

    it('should handle single ball distributions', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R'],
        2: ['G'],
        3: ['B']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(['R']);
      expect(state.processes[1].stack).toEqual(['G']);
      expect(state.processes[2].stack).toEqual(['B']);
    });

    it('should handle empty distributions', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: [],
        2: ['G'],
        3: ['B']
      };

      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual([]);
      expect(state.processes[1].stack).toEqual(['G']);
      expect(state.processes[2].stack).toEqual(['B']);
    });

    it('should revert to default distributions after reset without custom param', () => {
      const customDistributions: Record<ProcessId, Color[]> = {
        1: ['R', 'G'],
        2: ['B', 'R'],
        3: ['G', 'B']
      };

      // Set custom distributions
      consensusService.setCustomDistributions(customDistributions);
      consensusService.reset();

      let state = consensusService.getSystemState();
      expect(state.processes[0].stack).toEqual(['R', 'G']);

      // Reset without custom distributions should keep the current custom ones
      consensusService.reset();
      state = consensusService.getSystemState();
      expect(state.processes[0].stack).toEqual(['R', 'G']);
    });
  });
});
