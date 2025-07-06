import { Injectable } from '@nestjs/common';
import { Color, ProcessId, ProcessState, Message } from '../types';

/**
 * Service responsible for system validation and logging
 */
@Injectable()
export class LoggingSystemService {

  /**
   * Log current system state for debugging
   */
  logSystemState(processes: ProcessState[], totalExchanges: number, calculatePotentialFunction: () => number): void {
    console.log('Current System State:');
    for (const process of processes) {
      const status = process.isDone ? '✅ DONE' : 'ACTIVE';
      const stack = process.stack.join(',');
      const wanted = process.wanted || 'none';
      const partner = process.partner || 'none';
      console.log(`  Process ${process.id}: ${status} | Stack: [${stack}] | Wants: ${wanted} | Partner: ${partner}`);
    }
    console.log(`Total Exchanges: ${totalExchanges}`);
    console.log(`Potential Function Φ: ${calculatePotentialFunction()}`);
  }

  /**
   * Log final state summary
   */
  logFinalState(
    processes: ProcessState[], 
    messageQueue: Message[], 
    totalExchanges: number, 
    calculatePotentialFunction: () => number,
    initialDistributions?: Record<ProcessId, Color[]>
  ): void {
    console.log('\nFINAL RESULTS:');
    
    let totalFinalBalls = 0;
    const finalColorCounts = new Map<Color, number>();
    
    for (const process of processes) {
      const uniqueColors = new Set(process.stack);
      const isMonochrome = uniqueColors.size <= 1;
      const status = isMonochrome ? '✅ MONOCHROME' : '❌ MIXED';
      const color = process.stack.length > 0 ? process.stack[0] : 'empty';
      const count = process.stack.length;
      
      totalFinalBalls += count;
      if (color !== 'empty') {
        finalColorCounts.set(color as Color, (finalColorCounts.get(color as Color) || 0) + count);
      }
      
      console.log(`  Process ${process.id}: ${status} | ${count} ${color} balls`);
    }
    
    // Check for balls still in transit
    let ballsInTransit = 0;
    for (const message of messageQueue) {
      if (message.type === 'SEND' && message.color) {
        ballsInTransit++;
      }
    }
    
    console.log(`\nAlgorithm completed with ${totalExchanges} total ball exchanges`);
    console.log(`Final potential function Φ: ${calculatePotentialFunction()}`);
    console.log(`Final ball count: ${totalFinalBalls} balls (${ballsInTransit} in transit)`);
    console.log(`Final color distribution: ${Array.from(finalColorCounts.entries()).map(([c, n]) => `${n} ${c}`).join(', ')}`);
    
    // Calculate expected total from initial distributions
    let expectedTotal = 30; // Default for backward compatibility
    if (initialDistributions) {
      expectedTotal = 0;
      for (const [processId, distribution] of Object.entries(initialDistributions)) {
        expectedTotal += distribution.length;
      }
    }
    
    if (totalFinalBalls + ballsInTransit !== expectedTotal) {
      console.error(`❌ CRITICAL ERROR: Ball count mismatch! Expected ${expectedTotal} total, found ${totalFinalBalls + ballsInTransit} (${totalFinalBalls} in processes + ${ballsInTransit} in transit)`);
    }
  }
}
