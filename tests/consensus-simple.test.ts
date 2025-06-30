import { StandaloneConsensusService } from '../src/consensus/standalone-consensus';

describe('Consensus Algorithm - Core Logic', () => {
  let service: StandaloneConsensusService;

  beforeEach(() => {
    service = new StandaloneConsensusService();
  });

  afterEach(() => {
    service.reset();
  });

  test('should initialize with correct starting distributions', () => {
    const state = service.getSystemState();
    
    expect(state.processes).toHaveLength(3);
    expect(state.processes[0].stack).toEqual(["R","R","R","G","G","G","B","B","B","R"]);
    expect(state.processes[1].stack).toEqual(["G","G","G","R","R","B","B","B","R","R"]);
    expect(state.processes[2].stack).toEqual(["B","B","B","B","R","G","G","G","G","R"]);
  });

  test('should have all processes initially not done', () => {
    const state = service.getSystemState();
    
    for (const process of state.processes) {
      expect(process.isActive).toBe(true);
      expect(process.isDone).toBe(false);
    }
  });

  test('should calculate initial potential function', () => {
    const phi = service.calculatePotentialFunction();
    expect(phi).toBeGreaterThan(0);
    expect(phi).toBeLessThan(30); // Can't be more than total balls
  });

  test('should preserve total ball count', () => {
    const initialState = service.getSystemState();
    const initialTotal = initialState.processes.reduce(
      (sum, p) => sum + p.stack.length, 0
    );
    
    service.reset();
    
    const afterResetState = service.getSystemState();
    const afterResetTotal = afterResetState.processes.reduce(
      (sum, p) => sum + p.stack.length, 0
    );
    
    expect(afterResetTotal).toBe(initialTotal);
    expect(initialTotal).toBe(30); // Total expected balls
  });

  test('should track system state history', () => {
    const initialHistory = service.getSystemHistory();
    expect(initialHistory.length).toBeGreaterThan(0);
    
    const firstState = initialHistory[0];
    expect(firstState.processes).toHaveLength(3);
    expect(firstState.totalExchanges).toBe(0);
    expect(firstState.isComplete).toBe(false);
  });

  test('should reset correctly', () => {
    service.reset();
    
    const newState = service.getSystemState();
    expect(newState.totalExchanges).toBe(0);
    expect(newState.isComplete).toBe(false);
    expect(newState.processes.every(p => !p.isDone)).toBe(true);
  });

  test('should verify initial color distribution', () => {
    const state = service.getSystemState();
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

  test('potential function should be deterministic', () => {
    const phi1 = service.calculatePotentialFunction();
    const phi2 = service.calculatePotentialFunction();
    
    expect(phi1).toBe(phi2);
  });

  test('should eventually reach consensus', async () => {
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
    
    // Should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
    
    console.log(`✅ Consensus reached in ${endTime - startTime}ms with ${state.totalExchanges} exchanges`);
  }, 10000);

  test('should preserve color distribution through consensus', async () => {
    const initialState = service.getSystemState();
    const initialColorCounts = new Map();
    
    for (const process of initialState.processes) {
      for (const color of process.stack) {
        initialColorCounts.set(color, (initialColorCounts.get(color) || 0) + 1);
      }
    }
    
    await service.startConsensus();
    
    const finalState = service.getSystemState();
    const finalColorCounts = new Map();
    
    for (const process of finalState.processes) {
      for (const color of process.stack) {
        finalColorCounts.set(color, (finalColorCounts.get(color) || 0) + 1);
      }
    }
    
    expect(finalColorCounts).toEqual(initialColorCounts);
  }, 10000);
});
