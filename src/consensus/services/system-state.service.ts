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
    // Check traditional complete state first
    const allProcessesDone = processes.every(p => p.isDone);
    const noMessagesInTransit = messageQueue.length === 0;
    
    if (allProcessesDone && noMessagesInTransit) {
      return true;
    }

    // Enhanced: Check for optimal consensus when perfect monochrome isn't possible
    return this.isOptimalConsensusReached(processes, messageQueue);
  }

  /**
   * Check if the system has reached optimal consensus for unequal color distributions
   */
  private isOptimalConsensusReached(processes: ProcessState[], messageQueue: Message[]): boolean {
    // No messages should be in transit
    if (messageQueue.length > 0) {
      return false;
    }

    // First check if perfect monochrome is theoretically possible
    if (this.isPerfectMonochromeAchievable(processes)) {
      // If perfect monochrome is achievable, only accept perfect monochrome
      return processes.every(p => p.stack.length === 0 || new Set(p.stack).size === 1);
    }

    // If perfect monochrome is not achievable, check for optimal distribution
    const totalColorCounts = this.getTotalColorCounts(processes);
    
    // Check if current distribution is optimal (can't be improved further)
    for (const process of processes) {
      if (process.stack.length === 0) continue;
      
      // Check if this process can still improve by finding better color concentrations
      if (this.canProcessImprove(process, totalColorCounts)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate total color counts across all processes
   */
  private getTotalColorCounts(processes: ProcessState[]): Map<Color, number> {
    const colorCounts = new Map<Color, number>();
    
    for (const process of processes) {
      for (const color of process.stack) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }
    
    return colorCounts;
  }

  /**
   * Check if a process can still improve its color concentration
   */
  private canProcessImprove(process: ProcessState, totalColorCounts: Map<Color, number>): boolean {
    if (process.stack.length === 0) return false;

    const processColorCounts = new Map<Color, number>();
    for (const color of process.stack) {
      processColorCounts.set(color, (processColorCounts.get(color) || 0) + 1);
    }

    // Find the dominant color in this process
    const dominantColor = Array.from(processColorCounts.entries())
      .reduce((max, current) => current[1] > max[1] ? current : max)[0];
    
    const dominantCount = processColorCounts.get(dominantColor) || 0;
    const totalOfDominantColor = totalColorCounts.get(dominantColor) || 0;
    
    // If this process already has all available balls of its dominant color, it can't improve
    const maxPossibleDominantBalls = Math.min(totalOfDominantColor, process.stack.length);
    
    return dominantCount < maxPossibleDominantBalls;
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

  /**
   * Check if perfect monochrome is mathematically achievable given the color distribution
   */
  isPerfectMonochromeAchievable(processes: ProcessState[]): boolean {
    const totalColorCounts = this.getTotalColorCounts(processes);
    const processCount = processes.length;
    
    console.log(`Checking perfect monochrome achievability:`, {
      totalColorCounts: Array.from(totalColorCounts.entries()),
      processCount
    });
    
    // For perfect monochrome, each process must have balls of only one color
    const nonZeroColors = Array.from(totalColorCounts.entries()).filter(([_, count]) => count > 0);
    
    if (nonZeroColors.length < processCount) {
      console.log(`❌ Not enough colors: ${nonZeroColors.length} colors < ${processCount} processes`);
      return false;
    }
    
    // Calculate total balls per process
    const totalBalls = Array.from(totalColorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // Simple check: if balls per process is not an integer, perfect monochrome is impossible
    if (totalBalls % processCount !== 0) {
      console.log(`❌ Balls per process not integer: ${totalBalls} balls ÷ ${processCount} processes`);
      return false;
    }
    
    const ballsPerProcess = totalBalls / processCount;
    console.log(`Balls per process: ${ballsPerProcess}`);
    
    // Check if we can assign exactly one color to each process such that
    // each process gets exactly ballsPerProcess balls
    
    // For this to work, we need to be able to partition the balls into processCount groups
    // where each group contains exactly ballsPerProcess balls of the same color
    
    // Sort colors by count (descending)
    const sortedColors = Array.from(totalColorCounts.entries()).sort((a, b) => b[1] - a[1]);
    console.log(`Sorted colors:`, sortedColors);
    
    // Use a greedy approach: try to assign the largest color counts to processes
    const remainingCounts = new Map(sortedColors);
    const assignments: number[] = [];
    
    for (let i = 0; i < processCount; i++) {
      // Find the best color that can provide exactly ballsPerProcess balls
      let assigned = false;
      
      for (const [color, count] of remainingCounts.entries()) {
        if (count >= ballsPerProcess) {
          assignments.push(ballsPerProcess);
          remainingCounts.set(color, count - ballsPerProcess);
          if (remainingCounts.get(color) === 0) {
            remainingCounts.delete(color);
          }
          console.log(`✅ Assigned ${ballsPerProcess} ${color} balls to process ${i + 1}`);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        console.log(`❌ Could not assign ${ballsPerProcess} balls to process ${i + 1}`);
        return false;
      }
    }
    
    // Check if all balls are assigned
    const totalAssigned = assignments.reduce((sum, count) => sum + count, 0);
    const result = totalAssigned === totalBalls;
    console.log(`Perfect monochrome achievable: ${result} (${totalAssigned} assigned of ${totalBalls} total)`);
    return result;
  }
}
