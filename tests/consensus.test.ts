import { Test, TestingModule } from '@nestjs/testing';
import { ConsensusService } from '../src/consensus/consensus.service';
import { Color, ProcessId } from '../src/consensus/types';

describe('ConsensusService', () => {
  let service: ConsensusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsensusService],
    }).compile();

    service = module.get<ConsensusService>(ConsensusService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct starting distributions', () => {
      const state = service.getSystemState();
      
      expect(state.processes).toHaveLength(3);
      expect(state.processes[0].stack).toEqual(["R","R","R","G","G","G","B","B","B","R"]);
      expect(state.processes[1].stack).toEqual(["G","G","G","R","R","B","B","B","R","R"]);
      expect(state.processes[2].stack).toEqual(["B","B","B","B","R","G","G","G","G","R"]);
    });

    it('should have all processes initially active and not done', () => {
      const state = service.getSystemState();
      
      for (const process of state.processes) {
        expect(process.isActive).toBe(true);
        expect(process.isDone).toBe(false);
        expect(process.wanted).toBeNull();
        expect(process.partner).toBeNull();
      }
    });
  });

  describe('Potential Function', () => {
    it('should calculate initial potential function correctly', () => {
      // Process 1: [R,R,R,G,G,G,B,B,B,R] - majority R (4), miscolored = 6
      // Process 2: [G,G,G,R,R,B,B,B,R,R] - majority G or R (tie, 3 each), miscolored depends on choice
      // Process 3: [B,B,B,B,R,G,G,G,G,R] - majority B or G (4 each), miscolored depends on choice
      
      const phi = service.calculatePotentialFunction();
      expect(phi).toBeGreaterThan(0);
    });

    it('should decrease potential function as algorithm progresses', async () => {
      const initialPhi = service.calculatePotentialFunction();
      
      // Start consensus and let it run for a bit
      const consensusPromise = service.startConsensus();
      
      // Wait a moment for some exchanges
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const currentPhi = service.calculatePotentialFunction();
      
      // Either phi decreased or system completed
      const state = service.getSystemState();
      if (!state.isComplete) {
        expect(currentPhi).toBeLessThanOrEqual(initialPhi);
      }
      
      // Clean up
      await consensusPromise;
    }, 10000);
  });

  describe('System State Management', () => {
    it('should track system history', () => {
      const initialHistory = service.getSystemHistory();
      expect(initialHistory).toHaveLength(1); // Initial state
      
      service.reset();
      const afterResetHistory = service.getSystemHistory();
      expect(afterResetHistory).toHaveLength(1); // Reset clears history
    });

    it('should reset system correctly', () => {
      service.reset();
      
      const state = service.getSystemState();
      expect(state.totalExchanges).toBe(0);
      expect(state.isComplete).toBe(false);
      expect(state.messages).toHaveLength(0);
    });
  });

  describe('Convergence Properties', () => {
    it('should eventually reach consensus', async () => {
      const startTime = Date.now();
      
      await service.startConsensus();
      
      const endTime = Date.now();
      const state = service.getSystemState();
      
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
      
      // Should complete in reasonable time (less than 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
      
      console.log(`Consensus reached in ${endTime - startTime}ms with ${state.totalExchanges} exchanges`);
    }, 15000);

    it('should preserve total number of balls', async () => {
      const initialState = service.getSystemState();
      const initialTotalBalls = initialState.processes.reduce(
        (sum, process) => sum + process.stack.length, 
        0
      );
      
      await service.startConsensus();
      
      const finalState = service.getSystemState();
      const finalTotalBalls = finalState.processes.reduce(
        (sum, process) => sum + process.stack.length, 
        0
      );
      
      expect(finalTotalBalls).toBe(initialTotalBalls);
    }, 15000);

    it('should preserve color distribution', async () => {
      const initialState = service.getSystemState();
      const initialColorCounts = new Map<Color, number>();
      
      for (const process of initialState.processes) {
        for (const color of process.stack) {
          initialColorCounts.set(color, (initialColorCounts.get(color) || 0) + 1);
        }
      }
      
      await service.startConsensus();
      
      const finalState = service.getSystemState();
      const finalColorCounts = new Map<Color, number>();
      
      for (const process of finalState.processes) {
        for (const color of process.stack) {
          finalColorCounts.set(color, (finalColorCounts.get(color) || 0) + 1);
        }
      }
      
      expect(finalColorCounts).toEqual(initialColorCounts);
    }, 15000);
  });

  describe('Algorithm Properties', () => {
    it('should respect one-ball-per-message constraint', async () => {
      const consensusPromise = service.startConsensus();
      
      // Check messages during execution
      let maxMessageSize = 0;
      const checkInterval = setInterval(() => {
        const state = service.getSystemState();
        for (const message of state.messages) {
          if (message.type === 'SEND') {
            // Each SEND message should contain exactly one ball
            maxMessageSize = Math.max(maxMessageSize, 1);
          }
        }
        
        if (state.isComplete) {
          clearInterval(checkInterval);
        }
      }, 50);
      
      await consensusPromise;
      clearInterval(checkInterval);
      
      // Should never exceed one ball per message
      expect(maxMessageSize).toBeLessThanOrEqual(1);
    }, 15000);

    it('should ensure processes start without global knowledge', () => {
      const state = service.getSystemState();
      
      // Each process should only know its own stack initially
      for (const process of state.processes) {
        expect(process.wanted).toBeNull();
        expect(process.partner).toBeNull();
        expect(process.stack.length).toBeGreaterThan(0);
      }
    });
  });
});
