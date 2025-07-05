import { Test, TestingModule } from '@nestjs/testing';
import { BaseConsensusService } from '../src/consensus/base-consensus.service';
import { ColorSelectionService } from '../src/consensus/services/color-selection.service';
import { PartnerSelectionService } from '../src/consensus/services/partner-selection.service';
import { MessageHandlingService } from '../src/consensus/services/message-handling.service';
import { ValidationService } from '../src/consensus/services/validation.service';
import { SystemStateService } from '../src/consensus/services/system-state.service';

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
        ValidationService,
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
      expect(module.get(ValidationService)).toBeDefined();
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
        expect(process.isActive).toBe(true);
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
        expect(process.isActive).toBe(false);
        
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
});
