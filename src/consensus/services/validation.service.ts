import { Injectable } from '@nestjs/common';
import { Color, ProcessState, Message } from '../types';

/**
 * Service responsible for system validation and logging
 */
@Injectable()
export class ValidationService {
  
  /**
   * Validate that total ball count is preserved (conservation invariant)
   */
  validateBallConservation(processes: ProcessState[], messageQueue: Message[]): boolean {
    const currentCounts = new Map<Color, number>();
    let totalBalls = 0;
    
    // Count balls in all process stacks
    for (const process of processes) {
      totalBalls += process.stack.length;
      for (const color of process.stack) {
        currentCounts.set(color, (currentCounts.get(color) || 0) + 1);
      }
    }
    
    // Count balls in transit (in message queue)
    for (const message of messageQueue) {
      if (message.type === 'SEND' && message.color) {
        totalBalls++;
        currentCounts.set(message.color, (currentCounts.get(message.color) || 0) + 1);
      }
    }
    
    // Expected: 10 of each color, 30 total
    const expectedTotal = 30;
    const expectedPerColor = 10;
    
    let isValid = true;
    if (totalBalls !== expectedTotal) {
      console.error(`❌ BALL CONSERVATION VIOLATED: Expected ${expectedTotal} total balls, found ${totalBalls}`);
      isValid = false;
    }
    
    for (const color of ['R', 'G', 'B'] as Color[]) {
      const count = currentCounts.get(color) || 0;
      if (count !== expectedPerColor) {
        console.error(`❌ COLOR CONSERVATION VIOLATED: Expected ${expectedPerColor} ${color} balls, found ${count}`);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log(`✅ Ball conservation verified: ${totalBalls} total balls, ${Array.from(currentCounts.entries()).map(([c, n]) => `${n} ${c}`).join(', ')}`);
    }
    
    return isValid;
  }

  /**
   * Log current system state for debugging
   */
  logSystemState(processes: ProcessState[], totalExchanges: number, calculatePotentialFunction: () => number): void {
    console.log('Current System State:');
    for (const process of processes) {
      const status = process.isDone ? '✅ DONE' : (process.isActive ? '🟡 ACTIVE' : '⭕ INACTIVE');
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
    calculatePotentialFunction: () => number
  ): void {
    console.log('\n🎯 FINAL RESULTS:');
    
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
    
    console.log(`\n📊 Algorithm completed with ${totalExchanges} total ball exchanges`);
    console.log(`📉 Final potential function Φ: ${calculatePotentialFunction()}`);
    console.log(`📊 Final ball count: ${totalFinalBalls} balls (${ballsInTransit} in transit)`);
    console.log(`📊 Final color distribution: ${Array.from(finalColorCounts.entries()).map(([c, n]) => `${n} ${c}`).join(', ')}`);
    
    if (totalFinalBalls + ballsInTransit !== 30) {
      console.error(`❌ CRITICAL ERROR: Ball count mismatch! Expected 30 total, found ${totalFinalBalls + ballsInTransit} (${totalFinalBalls} in processes + ${ballsInTransit} in transit)`);
    }
  }
}
