import { Injectable } from '@nestjs/common';
import { Color, ProcessState, Message, SystemState } from '../types';

/**
 * Service responsible for system state management and calculations
 */
@Injectable()
export class SystemStateService {
  
  /**
   * Check if the entire system has reached consensus
   */
  isSystemComplete(processes: ProcessState[], messageQueue: Message[]): boolean {
    // System is only complete when:
    // 1. All processes are done AND
    // 2. No messages are in transit (especially SEND messages)
    const allProcessesDone = processes.every(p => p.isDone);
    const noMessagesInTransit = messageQueue.length === 0;
    
    return allProcessesDone && noMessagesInTransit;
  }

  /**
   * Calculate the potential function Φ = total number of miscolored balls
   * This proves convergence as Φ strictly decreases with each successful exchange
   */
  calculatePotentialFunction(processes: ProcessState[]): number {
    let phi = 0;
    
    for (const process of processes) {
      if (process.stack.length === 0) continue;
      
      const colorCounts = new Map<Color, number>();
      for (const color of process.stack) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
      
      const maxCount = Math.max(...Array.from(colorCounts.values()));
      const miscoloredBalls = process.stack.length - maxCount;
      phi += miscoloredBalls;
    }
    
    return phi;
  }

  /**
   * Create a snapshot of the current system state
   */
  createSystemState(processes: ProcessState[], messageQueue: Message[], totalExchanges: number): SystemState {
    return {
      processes: processes.map(p => ({ ...p })),
      messages: [...messageQueue],
      isComplete: this.isSystemComplete(processes, messageQueue),
      totalExchanges: totalExchanges
    };
  }

  /**
   * Save current system state to history
   */
  saveSystemState(
    processes: ProcessState[], 
    messageQueue: Message[], 
    totalExchanges: number, 
    systemHistory: SystemState[]
  ): void {
    const state = this.createSystemState(processes, messageQueue, totalExchanges);
    systemHistory.push(state);
  }

  /**
   * Utility method to add delay for visualization
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
