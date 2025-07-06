import { Test, TestingModule } from '@nestjs/testing';
import { BaseConsensusService } from '../src/consensus/base-consensus.service';
import { ColorSelectionService } from '../src/consensus/services/color-selection.service';
import { PartnerSelectionService } from '../src/consensus/services/partner-selection.service';
import { MessageHandlingService } from '../src/consensus/services/message-handling.service';
import { LoggingSystemService } from '../src/consensus/services/logging-system.service';
import { SystemStateService } from '../src/consensus/services/system-state.service';
import {Color, ProcessId} from "../src/consensus/types";

describe('Simple Tests', () => {
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

  describe('NestJS Dependency Injection', () => {
    it('should inject all required services', () => {
      expect(module.get(BaseConsensusService)).toBeDefined();
      expect(module.get(ColorSelectionService)).toBeDefined();
      expect(module.get(PartnerSelectionService)).toBeDefined();
      expect(module.get(MessageHandlingService)).toBeDefined();
      expect(module.get(LoggingSystemService)).toBeDefined();
      expect(module.get(SystemStateService)).toBeDefined();
    });

    it('should have proper service isolation', () => {
      const colorService1 = module.get(ColorSelectionService);
      const colorService2 = module.get(ColorSelectionService);
      
      // Should be the same instance (singleton in module scope)
      expect(colorService1).toBe(colorService2);
    });

    it('should create service instances with proper decorators', () => {
      expect(consensusService).toBeInstanceOf(BaseConsensusService);
      expect(colorSelectionService).toBeInstanceOf(ColorSelectionService);
      expect(systemStateService).toBeInstanceOf(SystemStateService);
    });
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(consensusService).toBeDefined();
      expect(colorSelectionService).toBeDefined();
      expect(systemStateService).toBeDefined();
    });

    it('should initialize with correct starting distributions', () => {
      const state = consensusService.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(["R","R","R","G","G","G","B","B","B","R"]);
      expect(state.processes[1].stack).toEqual(["G","G","G","R","R","B","B","B","R","R"]);
      expect(state.processes[2].stack).toEqual(["B","B","B","B","R","G","G","G","G","R"]);
    });

    it('should have all processes initially not done', () => {
      const state = consensusService.getSystemState();
      
      for (const process of state.processes) {
        expect(process.isDone).toBe(false);
      }
    });
  });

  describe('Potential Function', () => {
    it('should calculate initial potential function', () => {
      const phi = consensusService.calculatePotentialFunction();
      expect(phi).toBeGreaterThan(0);
      expect(phi).toBeLessThan(30); // Can't be more than total balls
    });

    it('should be deterministic', () => {
      const phi1 = consensusService.calculatePotentialFunction();
      const phi2 = consensusService.calculatePotentialFunction();
      
      expect(phi1).toBe(phi2);
    });
  });

  describe('Ball Conservation', () => {
    it('should preserve total ball count', () => {
      const initialState = consensusService.getSystemState();
      const initialTotal = initialState.processes.reduce(
        (sum, p) => sum + p.stack.length, 0
      );
      
      consensusService.reset();
      
      const afterResetState = consensusService.getSystemState();
      const afterResetTotal = afterResetState.processes.reduce(
        (sum, p) => sum + p.stack.length, 0
      );
      
      expect(afterResetTotal).toBe(initialTotal);
      expect(initialTotal).toBe(30); // Total expected balls
    });

    it('should verify initial color distribution', () => {
      const state = consensusService.getSystemState();
      const allBalls: string[] = [];
      
      for (const process of state.processes) {
        allBalls.push(...process.stack);
      }
      
      const colorCounts = new Map();
      for (const ball of allBalls) {
        colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
      }
      
      // Each color should appear exactly 10 times
      expect(colorCounts.get('R')).toBe(10);
      expect(colorCounts.get('G')).toBe(10);
      expect(colorCounts.get('B')).toBe(10);
    });
  });

  describe('System State Management', () => {
    it('should track system state history', () => {
      const initialHistory = consensusService.getSystemHistory();
      expect(initialHistory.length).toBeGreaterThan(0);
      
      const firstState = initialHistory[0];
      expect(firstState.processes).toHaveLength(3);
      expect(firstState.totalExchanges).toBe(0);
      expect(firstState.isComplete).toBe(false);
    });

    it('should reset correctly', () => {
      consensusService.reset();
      
      const newState = consensusService.getSystemState();
      expect(newState.totalExchanges).toBe(0);
      expect(newState.isComplete).toBe(false);
      expect(newState.processes.every(p => !p.isDone)).toBe(true);
    });
  });

  describe('Consensus Algorithm', () => {
    it('should eventually reach consensus', async () => {
      const startTime = Date.now();
      
      await consensusService.startConsensus();
      
      const endTime = Date.now();
      const state = consensusService.getSystemState();
      
      // Verify convergence
      expect(state.isComplete).toBe(true);
      
      // Verify all processes are monochrome
      for (const process of state.processes) {
        expect(process.isDone).toBe(true);
        
        if (process.stack.length > 0) {
          const uniqueColors = new Set(process.stack);
          expect(uniqueColors.size).toBe(1);
        }
      }
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      console.log(`✅ Consensus reached in ${endTime - startTime}ms with ${state.totalExchanges} exchanges`);
    }, 10000);

    it('should preserve color distribution through consensus', async () => {
      const initialState = consensusService.getSystemState();
      const initialColorCounts = new Map();
      
      for (const process of initialState.processes) {
        for (const color of process.stack) {
          initialColorCounts.set(color, (initialColorCounts.get(color) || 0) + 1);
        }
      }
      
      await consensusService.startConsensus();
      
      const finalState = consensusService.getSystemState();
      const finalColorCounts = new Map();
      
      for (const process of finalState.processes) {
        for (const color of process.stack) {
          finalColorCounts.set(color, (finalColorCounts.get(color) || 0) + 1);
        }
      }
      
      expect(finalColorCounts).toEqual(initialColorCounts);
    }, 10000);
  });


  it('should handle two colors with three processes - unbalanced distribution', async () => {
    const customDistributions: Record<ProcessId, Color[]> = {
      1: ['R', 'R', 'R', 'G'],
      2: ['G'],
      3: ['R', 'G']
    };


      // Debug: check distribution before reset
      let stateBefore = consensusService.getSystemState();
      expect(stateBefore.processes[0].stack.length).toBe(10); // Should be default (10 balls)

    consensusService.reset(customDistributions);

      // Debug: check distribution after reset
      const initialState = consensusService.getSystemState();
      expect(initialState.processes[0].stack.length).toBe(4); // Should be custom (4 balls)
      expect(initialState.processes).toHaveLength(3);

      // Verify initial distribution
      expect(initialState.processes[0].stack).toEqual(['R', 'R', 'R', 'G']);
      expect(initialState.processes[1].stack).toEqual(['G']);
      expect(initialState.processes[2].stack).toEqual(['R', 'G']);


      expect(initialState.processes).toHaveLength(3);

      const startTime = Date.now();
      await consensusService.startConsensus();
      const endTime = Date.now();

      const finalState = consensusService.getSystemState();

      // Verify consensus reached
      expect(finalState.isComplete).toBe(true);

      // Check that all processes are monochrome (optimal solution)
      const isMonochrome = (stack: Color[]) => stack.length === 0 || new Set(stack).size === 1;
      expect(isMonochrome(finalState.processes[0].stack)).toBe(true);
      expect(isMonochrome(finalState.processes[1].stack)).toBe(true);
      expect(isMonochrome(finalState.processes[2].stack)).toBe(true);
      console.log(`Process 0: [${finalState.processes.join(',')}] isDone: ${finalState.processes[0].isDone}`);
      // Verify that the total balls are conserved
      const totalFinalBalls = finalState.processes.reduce((sum, p) => sum + p.stack.length, 0);
      expect(totalFinalBalls).toBe(7);

      // Verify that colors are conserved
      const finalReds = finalState.processes.reduce((sum, p) => sum + p.stack.filter(c => c === 'R').length, 0);
      const finalGreens = finalState.processes.reduce((sum, p) => sum + p.stack.filter(c => c === 'G').length, 0);
      expect(finalReds).toBe(4);
      expect(finalGreens).toBe(3);

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
});
