import { Injectable } from '@nestjs/common';
import { Color, ProcessId, ProcessState, Message } from '../types';

/**
 * Service responsible for color selection logic and conflict resolution
 */
@Injectable()
export class ColorSelectionService {

  /**
   * Deterministic color priority assignment based on process ID
   * Ensures each process has a preferred color to avoid conflicts
   */
  getColorPriorityForProcess(processId: ProcessId, color: Color): number {
    // Create deterministic mapping: Process 1->R priority, Process 2->G priority, Process 3->B priority
    const priorities: Record<ProcessId, Color[]> = {
      1: ['R', 'G', 'B'], // Process 1 prefers R, then G, then B
      2: ['G', 'B', 'R'], // Process 2 prefers G, then B, then R  
      3: ['B', 'R', 'G']  // Process 3 prefers B, then R, then G
    };
    
    const processColorOrder = priorities[processId];
    return processColorOrder.indexOf(color) + 1; // 1 = highest priority, 3 = lowest
  }

  /**
   * Estimate if other processes likely have stronger claims on this color
   * Uses observable message patterns and exchange history
   */
  estimateOtherProcessClaims(process: ProcessState, color: Color, messageQueue: Message[] = []): boolean {
    // Look at recent message patterns to infer other processes' preferences
    const recentMessages = messageQueue.slice(-10); // Last 10 messages
    
    let competingRequests = 0;
    for (const message of recentMessages) {
      if (message.type === 'REQUEST' && message.color === color && message.from !== process.id) {
        competingRequests++;
      }
    }
    
    // If we see multiple recent requests for this color from others, they likely have strong claims
    return competingRequests >= 2;
  }

  /**
   * Compute the wanted color for a process using advanced strategy
   */
  computeWantedColor(process: ProcessState, messageQueue: Message[] = []): void {
    // For empty processes, we need to determine what color they should want
    // based on what colors are available from other processes
    if (process.stack.length === 0) {
      // Empty processes should want a color that other processes have in excess
      // Use process ID as deterministic tiebreaker
      const priorityColors = this.getColorPriorityForProcess(process.id, 'R') === 1 ? ['R', 'G', 'B'] :
                           this.getColorPriorityForProcess(process.id, 'G') === 1 ? ['G', 'B', 'R'] :
                           ['B', 'R', 'G'];
      
      // Choose the first color in priority order as the wanted color
      process.wanted = priorityColors[0] as Color;
      console.log(`Process ${process.id} wants color ${process.wanted} (empty process)`);
      return;
    }

    const colorCounts = new Map<Color, number>();
    for (const color of process.stack) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    // Get all colors sorted by count (descending)
    const sortedColors = Array.from(colorCounts.entries())
      .sort(([,a], [,b]) => b - a);

    // Strategy: Use process ID as tiebreaker to avoid conflicts
    // This ensures deterministic color assignment without global coordination
    let selectedColor: Color = process.stack[0]; // fallback

    process.wanted = selectedColor;
    console.log(`Process ${process.id} wants color ${selectedColor} (has ${colorCounts.get(selectedColor)} balls)`);
  }

  /**
   * Detect color conflicts between processes
   */
  detectColorConflicts(processes: ProcessState[]): boolean {
    const colorWants = new Map<Color, ProcessId[]>();
    
    for (const process of processes) {
      if (process.wanted && !process.isDone) {
        if (!colorWants.has(process.wanted)) {
          colorWants.set(process.wanted, []);
        }
        colorWants.get(process.wanted)!.push(process.id);
      }
    }
    
    let hasConflicts = false;
    for (const [color, processIds] of Array.from(colorWants.entries())) {
      if (processIds.length > 1) {
        console.warn(`⚠️ COLOR CONFLICT: Processes [${processIds.join(', ')}] all want color ${color}`);
        hasConflicts = true;
        
        // Suggest resolution strategy
        console.log(`Resolution: Process ${processIds[0]} should keep ${color}, others should reconsider`);
      }
    }
    
    if (!hasConflicts) {
      console.log(`✅ No color conflicts detected`);
    }
    
    return hasConflicts;
  }

  /**
   * Force conflict resolution by reassigning colors to conflicted processes
   * Uses the priority system to determine who gets what
   */
  resolveColorConflicts(processes: ProcessState[]): void {
    const colorWants = new Map<Color, ProcessState[]>();
    
    // Group processes by wanted color
    for (const process of processes) {
      if (process.wanted && !process.isDone) {
        if (!colorWants.has(process.wanted)) {
          colorWants.set(process.wanted, []);
        }
        colorWants.get(process.wanted)!.push(process);
      }
    }
    
    // Resolve conflicts
    for (const [color, conflictedProcesses] of Array.from(colorWants.entries())) {
      if (conflictedProcesses.length > 1) {
        console.log(`Resolving conflict for color ${color} between processes [${conflictedProcesses.map(p => p.id).join(', ')}]`);
        
        // Sort by priority (who should get this color)
        conflictedProcesses.sort((a, b) => {
          const aPriority = this.getColorPriorityForProcess(a.id, color);
          const bPriority = this.getColorPriorityForProcess(b.id, color);
          return aPriority - bPriority; // Lower number = higher priority
        });
        
        // Winner keeps the color, others must choose alternatives
        const winner = conflictedProcesses[0];
        console.log(`Process ${winner.id} wins color ${color} (priority ${this.getColorPriorityForProcess(winner.id, color)})`);
        
        for (let i = 1; i < conflictedProcesses.length; i++) {
          const loser = conflictedProcesses[i];
          console.log(`Process ${loser.id} must choose alternative to ${color}`);
          this.forceAlternativeColor(loser, color);
        }
      }
    }
  }

  /**
   * Force a process to choose an alternative color when there's a conflict
   */
  forceAlternativeColor(process: ProcessState, conflictColor: Color): void {
    const colorCounts = new Map<Color, number>();
    for (const color of process.stack) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
    
    // Get alternative colors sorted by count, excluding the conflict color
    const alternatives = Array.from(colorCounts.entries())
      .filter(([color]) => color !== conflictColor)
      .sort(([,a], [,b]) => b - a);
    
    if (alternatives.length > 0) {
      const newWanted = alternatives[0][0];
      process.wanted = newWanted;
      console.log(`Process ${process.id} now wants ${newWanted} instead of ${conflictColor} (has ${alternatives[0][1]} balls)`);
    }
  }
}
