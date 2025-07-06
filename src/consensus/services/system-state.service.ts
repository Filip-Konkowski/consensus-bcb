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
    
    // Enhanced logic: Check if this process can improve by considering the global optimal distribution
    // For unequal color counts, we need to find the best possible distribution
    const optimalDistribution = this.calculateOptimalDistribution(totalColorCounts, process.stack.length);
    
    // Check if this process is already at or near its optimal state
    const dominantPercentage = dominantCount / process.stack.length;
    const optimalPercentage = optimalDistribution.maxPossibleDominantPercentage;
    
    // Allow some tolerance for floating point comparison
    const tolerance = 0.01;
    return dominantPercentage < (optimalPercentage - tolerance);
  }

  /**
   * Calculate the optimal distribution for a process given the total color counts
   */
  private calculateOptimalDistribution(totalColorCounts: Map<Color, number>, processSize: number): {
    maxPossibleDominantPercentage: number;
    optimalColor: Color;
  } {
    // For unequal distributions, the optimal strategy is to give each process 
    // as many balls as possible of a single color, starting with the most abundant colors
    
    const sortedColors = Array.from(totalColorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0);
    
    let maxPossibleDominantPercentage = 0;
    let optimalColor: Color = sortedColors[0][0]; // default to most abundant color
    
    for (const [color, availableCount] of sortedColors) {
      const maxBallsOfThisColor = Math.min(availableCount, processSize);
      const dominantPercentage = maxBallsOfThisColor / processSize;
      
      if (dominantPercentage > maxPossibleDominantPercentage) {
        maxPossibleDominantPercentage = dominantPercentage;
        optimalColor = color;
      }
    }
    
    return {
      maxPossibleDominantPercentage,
      optimalColor
    };
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
    
    // For perfect monochrome, each process must have balls of only one color
    const nonZeroColors = Array.from(totalColorCounts.entries()).filter(([_, count]) => count > 0);
    
    if (nonZeroColors.length < processCount) {
      return false;
    }
    
    // Calculate total balls
    const totalBalls = Array.from(totalColorCounts.values()).reduce((sum, count) => sum + count, 0);

    // Simple check: if balls per process is not an integer, perfect monochrome is impossible
    if (totalBalls % processCount !== 0) {
      return false;
    }
    
    const ballsPerProcess = totalBalls / processCount;
    
    // Check if we can assign exactly one color to each process such that
    // each process gets exactly ballsPerProcess balls
    
    // For this to work, we need to be able to partition the balls into processCount groups
    // where each group contains exactly ballsPerProcess balls of the same color
    
    // Sort colors by count (descending)
    const sortedColors = Array.from(totalColorCounts.entries()).sort((a, b) => b[1] - a[1]);
    
    // Try to assign colors to processes using a greedy approach
    const remainingCounts = new Map(sortedColors);
    let assignedProcesses = 0;
    
    for (const [color, count] of sortedColors) {
      const maxProcessesForThisColor = Math.floor(count / ballsPerProcess);
      const processesToAssign = Math.min(maxProcessesForThisColor, processCount - assignedProcesses);
      
      if (processesToAssign > 0) {
        assignedProcesses += processesToAssign;
        remainingCounts.set(color, count - (processesToAssign * ballsPerProcess));
      }
      
      if (assignedProcesses >= processCount) {
        break;
      }
    }
    
    const result = assignedProcesses >= processCount;
    return result;
  }
}
