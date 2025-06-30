import { Color, ProcessId, ProcessState, Message, SystemState } from './types';

/**
 * Standalone Consensus Service for Testing
 * (Without NestJS dependencies)
 */
export class StandaloneConsensusService {
  private processes: ProcessState[] = [];
  private messageQueue: Message[] = [];
  private systemHistory: SystemState[] = [];
  private totalExchanges = 0;
  private isRunning = false;

  // Initial ball distributions as specified
  private readonly initialDistributions: Record<ProcessId, Color[]> = {
    1: ["R","R","R","G","G","G","B","B","B","R"],
    2: ["G","G","G","R","R","B","B","B","R","R"],
    3: ["B","B","B","B","R","G","G","G","G","R"]
  };

  constructor() {
    this.initializeProcesses();
  }

  private initializeProcesses(): void {
    this.processes = [
      {
        id: 1,
        stack: [...this.initialDistributions[1]],
        wanted: null,
        partner: null,
        isDone: false,
        isActive: true
      },
      {
        id: 2,
        stack: [...this.initialDistributions[2]],
        wanted: null,
        partner: null,
        isDone: false,
        isActive: true
      },
      {
        id: 3,
        stack: [...this.initialDistributions[3]],
        wanted: null,
        partner: null,
        isDone: false,
        isActive: true
      }
    ];

    this.messageQueue = [];
    this.totalExchanges = 0;
    this.isRunning = false;
    this.systemHistory = [];
    
    this.saveSystemState();
  }

  async startConsensus(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consensus algorithm is already running');
    }

    console.log('🚀 Starting distributed ball sorting consensus algorithm');
    this.isRunning = true;
    let iterationCount = 0;

    // Each process computes its initial wanted color and starts the protocol
    for (const process of this.processes) {
      if (!process.isDone) {
        this.computeWantedColor(process);
        this.choosePartner(process);
        if (process.partner) {
          this.sendRequest(process);
        }
      }
    }

    console.log('\n--- Initial Process States ---');
    this.logSystemState();
    this.detectColorConflicts();
    this.validateBallConservation();

    // Process messages asynchronously until convergence
    while (this.isRunning && !this.isSystemComplete()) {
      await this.processNextMessage();
      iterationCount++;
      
      // Periodically check for conflicts and resolve them
      if (iterationCount % 10 === 0) {
        console.log(`\n--- Iteration ${iterationCount} - System Check ---`);
        this.detectColorConflicts();
        this.resolveColorConflicts();
        this.logSystemState();
        this.validateBallConservation();
      }
      
      await this.sleep(50); // Increased delay for better visualization
      
      // Safety check to prevent infinite loops
      if (iterationCount > 500) {
        console.warn('⚠️ Algorithm taking too long, forcing resolution');
        this.resolveColorConflicts();
        break;
      }
    }

    this.isRunning = false;
    console.log(`\n🎉 Consensus algorithm completed in ${iterationCount} iterations!`);
    this.validateBallConservation();
    this.logFinalState();
  }

  reset(): void {
    this.initializeProcesses();
  }

  getSystemState(): SystemState {
    return {
      processes: this.processes.map(p => ({ ...p })),
      messages: [...this.messageQueue],
      isComplete: this.isSystemComplete(),
      totalExchanges: this.totalExchanges
    };
  }

  getSystemHistory(): SystemState[] {
    return [...this.systemHistory];
  }

  private computeWantedColor(process: ProcessState): void {
    if (process.stack.length === 0) return;

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
    
    for (const [color, count] of sortedColors) {
      // Check if this process should claim this color based on:
      // 1. It has the most of this color among active processes (locally estimated)
      // 2. Use process ID as deterministic tiebreaker
      const shouldClaimColor = this.shouldProcessClaimColor(process, color, count);
      
      if (shouldClaimColor) {
        selectedColor = color;
        break;
      }
    }

    process.wanted = selectedColor;
    console.log(`🎯 Process ${process.id} wants color ${selectedColor} (has ${colorCounts.get(selectedColor)} balls)`);
  }

  /**
   * Determines if a process should claim a specific color
   * Uses local heuristics to avoid conflicts without global knowledge
   */
  private shouldProcessClaimColor(process: ProcessState, color: Color, count: number): boolean {
    // If this process has the majority of this color in its stack, it's a strong candidate
    const totalBalls = process.stack.length;
    const colorPercentage = count / totalBalls;
    
    // Strong claim: if this process has >50% of this color in its stack
    if (colorPercentage > 0.5) {
      return true;
    }
    
    // Medium claim: if this process has >=40% and has the "right" to this color
    // Use deterministic process ID-based assignment to avoid conflicts
    if (colorPercentage >= 0.4) {
      const colorPriority = this.getColorPriorityForProcess(process.id, color);
      return colorPriority === 1; // Highest priority for this color
    }
    
    // Weak claim: only if no other strong preference and this is the best option
    if (colorPercentage >= 0.3) {
      const colorPriority = this.getColorPriorityForProcess(process.id, color);
      // Check if other processes likely have stronger claims
      const otherProcessesLikelyStronger = this.estimateOtherProcessClaims(process, color);
      return colorPriority === 1 && !otherProcessesLikelyStronger;
    }
    
    return false;
  }

  /**
   * Deterministic color priority assignment based on process ID
   * Ensures each process has a preferred color to avoid conflicts
   */
  private getColorPriorityForProcess(processId: ProcessId, color: Color): number {
    // Create deterministic mapping: Process 1->R priority, Process 2->G priority, Process 3->B priority
    const colorOrder: Color[] = ['R', 'G', 'B'];
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
  private estimateOtherProcessClaims(process: ProcessState, color: Color): boolean {
    // Look at recent message patterns to infer other processes' preferences
    const recentMessages = this.messageQueue.slice(-10); // Last 10 messages
    
    let competingRequests = 0;
    for (const message of recentMessages) {
      if (message.type === 'REQUEST' && message.color === color && message.from !== process.id) {
        competingRequests++;
      }
    }
    
    // If we see multiple recent requests for this color from others, they likely have strong claims
    return competingRequests >= 2;
  }

  private choosePartner(process: ProcessState): void {
    const otherProcesses = this.processes.filter(p => 
      p.id !== process.id && !p.isDone && p.isActive
    );

    if (otherProcesses.length === 0) {
      process.partner = null;
      return;
    }

    // Improved partner selection: prefer processes that likely have what we want
    // and don't want what we're trying to collect
    let bestPartner: ProcessState | null = null;
    let bestScore = -1;

    for (const candidate of otherProcesses) {
      const score = this.calculatePartnerScore(process, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestPartner = candidate;
      }
    }

    // Fallback to round-robin if no clear preference
    if (!bestPartner || bestScore <= 0) {
      const currentPartnerIndex = process.partner ? 
        otherProcesses.findIndex(p => p.id === process.partner) : -1;
      
      const nextIndex = (currentPartnerIndex + 1) % otherProcesses.length;
      process.partner = otherProcesses[nextIndex].id;
    } else {
      process.partner = bestPartner.id;
    }

    console.log(`🤝 Process ${process.id} chose partner ${process.partner} (score: ${bestScore})`);
  }

  /**
   * Calculate how good a potential partner is for this process
   * Higher score = better partner choice
   */
  private calculatePartnerScore(process: ProcessState, candidate: ProcessState): number {
    if (!process.wanted) return 0;

    let score = 0;
    
    // Positive score: candidate has balls of the color we want
    const candidateColorCount = candidate.stack.filter(c => c === process.wanted).length;
    score += candidateColorCount * 3; // Strong positive factor
    
    // Negative score: candidate wants the same color we want (conflict)
    if (candidate.wanted === process.wanted) {
      score -= 10; // Strong penalty for conflict
    }
    
    // Positive score: we have balls of the color the candidate wants
    if (candidate.wanted) {
      const ourColorCount = process.stack.filter(c => c === candidate.wanted).length;
      const unwantedByUs = process.stack.filter(c => c === candidate.wanted && c !== process.wanted).length;
      score += unwantedByUs * 2; // We can help them, good mutual exchange
    }
    
    // Preference for processes with different color priorities
    const ourPriority = this.getColorPriorityForProcess(process.id, process.wanted);
    const theirPriority = candidate.wanted ? 
      this.getColorPriorityForProcess(candidate.id, candidate.wanted) : 0;
    
    // Bonus for complementary priorities (different preferred colors)
    if (candidate.wanted && candidate.wanted !== process.wanted) {
      score += 5;
    }
    
    return score;
  }

  private sendRequest(process: ProcessState): void {
    if (!process.partner || !process.wanted) return;

    const message: Message = {
      type: 'REQUEST',
      from: process.id,
      to: process.partner,
      color: process.wanted,
      timestamp: Date.now()
    };

    this.messageQueue.push(message);
  }

  private async processNextMessage(): Promise<void> {
    if (this.messageQueue.length === 0) {
      this.triggerNewRequests();
      return;
    }

    const message = this.messageQueue.shift()!;
    const recipient = this.processes.find(p => p.id === message.to);
    const sender = this.processes.find(p => p.id === message.from);

    if (!recipient || !sender) return;

    switch (message.type) {
      case 'REQUEST':
        this.handleRequest(message, recipient, sender);
        break;
      case 'SEND':
        this.handleSend(message, recipient, sender);
        break;
      case 'DONE':
        this.handleDone(message, recipient);
        break;
    }

    this.saveSystemState();
  }

  private handleRequest(message: Message, recipient: ProcessState, sender: ProcessState): void {
    if (!message.color) return;

    const requestedColor = message.color;
    console.log(`📨 Process ${recipient.id} received request for ${requestedColor} from Process ${sender.id}`);
    console.log(`   Process ${recipient.id} wants: ${recipient.wanted}, has: [${recipient.stack.join(',')}]`);
    
    // Find a ball of the requested color that we don't want
    const ballIndex = recipient.stack.findIndex((color: Color) => 
      color === requestedColor && color !== recipient.wanted
    );

    if (ballIndex !== -1) {
      const ballToSend = recipient.stack.splice(ballIndex, 1)[0];
      
      const sendMessage: Message = {
        type: 'SEND',
        from: recipient.id,
        to: sender.id,
        color: ballToSend,
        timestamp: Date.now()
      };

      this.messageQueue.push(sendMessage);
      console.log(`✅ Process ${recipient.id} sending ${ballToSend} to Process ${sender.id}`);
      
      // Check if recipient became monochrome after giving away a ball
      this.checkMonochrome(recipient);
    } else {
      console.log(`❌ Process ${recipient.id} cannot provide ${requestedColor} (doesn't have unwanted ${requestedColor})`);
    }

    // Continue the protocol only if not done
    if (!recipient.isDone) {
      this.computeWantedColor(recipient);
      this.choosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient);
      }
    }
  }

  private handleSend(message: Message, recipient: ProcessState, sender: ProcessState): void {
    if (!message.color) return;

    // CRITICAL: Always accept balls, even if recipient is done, to preserve total count
    recipient.stack.push(message.color);
    this.totalExchanges++;

    console.log(`📦 Process ${recipient.id} received ${message.color} from Process ${sender.id} (now has ${recipient.stack.length} balls)`);

    this.checkMonochrome(recipient);

    if (!recipient.isDone) {
      this.computeWantedColor(recipient);
      this.choosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient);
      }
    }
  }

  private handleDone(message: Message, recipient: ProcessState): void {
    const sender = this.processes.find(p => p.id === message.from);
    if (sender) {
      sender.isDone = true;
      sender.isActive = false;
    }
  }

  private checkMonochrome(process: ProcessState): void {
    if (process.stack.length === 0) return;

    const uniqueColors = new Set(process.stack);
    if (uniqueColors.size === 1) {
      process.isDone = true;
      process.isActive = false;

      for (const otherProcess of this.processes) {
        if (otherProcess.id !== process.id && !otherProcess.isDone) {
          const doneMessage: Message = {
            type: 'DONE',
            from: process.id,
            to: otherProcess.id,
            timestamp: Date.now()
          };
          this.messageQueue.push(doneMessage);
        }
      }
    }
  }

  private triggerNewRequests(): void {
    for (const process of this.processes) {
      if (!process.isDone && process.isActive) {
        // Only trigger new requests if no pending messages from this process
        const hasPendingMessages = this.messageQueue.some(m => m.from === process.id && m.type === 'REQUEST');
        if (!hasPendingMessages) {
          this.computeWantedColor(process);
          this.choosePartner(process);
          if (process.partner) {
            this.sendRequest(process);
          }
        }
      }
    }
  }

  private isSystemComplete(): boolean {
    // System is only complete when:
    // 1. All processes are done AND
    // 2. No messages are in transit (especially SEND messages)
    const allProcessesDone = this.processes.every(p => p.isDone);
    const noMessagesInTransit = this.messageQueue.length === 0;
    
    return allProcessesDone && noMessagesInTransit;
  }

  private saveSystemState(): void {
    const state = this.getSystemState();
    this.systemHistory.push(state);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculatePotentialFunction(): number {
    let phi = 0;
    
    for (const process of this.processes) {
      if (process.stack.length === 0) continue;
      
      const colorCounts = new Map<Color, number>();
      for (const color of process.stack) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
      
      const maxCount = Math.max(...colorCounts.values());
      const miscoloredBalls = process.stack.length - maxCount;
      phi += miscoloredBalls;
    }
    
    return phi;
  }

  /**
   * Detect and log color conflicts between processes
   * This helps identify when multiple processes want the same color
   */
  private detectColorConflicts(): void {
    const colorWants = new Map<Color, ProcessId[]>();
    
    for (const process of this.processes) {
      if (process.wanted && !process.isDone) {
        if (!colorWants.has(process.wanted)) {
          colorWants.set(process.wanted, []);
        }
        colorWants.get(process.wanted)!.push(process.id);
      }
    }
    
    let hasConflicts = false;
    for (const [color, processes] of colorWants.entries()) {
      if (processes.length > 1) {
        console.warn(`⚠️ COLOR CONFLICT: Processes [${processes.join(', ')}] all want color ${color}`);
        hasConflicts = true;
        
        // Suggest resolution strategy
        console.log(`💡 Resolution: Process ${processes[0]} should keep ${color}, others should reconsider`);
      }
    }
    
    if (!hasConflicts) {
      console.log(`✅ No color conflicts detected`);
    }
  }

  /**
   * Force conflict resolution by reassigning colors to conflicted processes
   * Uses the priority system to determine who gets what
   */
  private resolveColorConflicts(): void {
    const colorWants = new Map<Color, ProcessState[]>();
    
    // Group processes by wanted color
    for (const process of this.processes) {
      if (process.wanted && !process.isDone) {
        if (!colorWants.has(process.wanted)) {
          colorWants.set(process.wanted, []);
        }
        colorWants.get(process.wanted)!.push(process);
      }
    }
    
    // Resolve conflicts
    for (const [color, processes] of colorWants.entries()) {
      if (processes.length > 1) {
        console.log(`🔧 Resolving conflict for color ${color} between processes [${processes.map(p => p.id).join(', ')}]`);
        
        // Sort by priority (who should get this color)
        processes.sort((a, b) => {
          const aPriority = this.getColorPriorityForProcess(a.id, color);
          const bPriority = this.getColorPriorityForProcess(b.id, color);
          return aPriority - bPriority; // Lower number = higher priority
        });
        
        // Winner keeps the color, others must choose alternatives
        const winner = processes[0];
        console.log(`👑 Process ${winner.id} wins color ${color} (priority ${this.getColorPriorityForProcess(winner.id, color)})`);
        
        for (let i = 1; i < processes.length; i++) {
          const loser = processes[i];
          console.log(`🔄 Process ${loser.id} must choose alternative to ${color}`);
          this.forceAlternativeColor(loser, color);
        }
      }
    }
  }

  /**
   * Force a process to choose an alternative color when there's a conflict
   */
  private forceAlternativeColor(process: ProcessState, conflictColor: Color): void {
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
      console.log(`🎯 Process ${process.id} now wants ${newWanted} instead of ${conflictColor} (has ${alternatives[0][1]} balls)`);
    }
  }

  /**
   * Log current system state for debugging
   */
  private logSystemState(): void {
    console.log('Current System State:');
    for (const process of this.processes) {
      const status = process.isDone ? '✅ DONE' : (process.isActive ? '🟡 ACTIVE' : '⭕ INACTIVE');
      const stack = process.stack.join(',');
      const wanted = process.wanted || 'none';
      const partner = process.partner || 'none';
      console.log(`  Process ${process.id}: ${status} | Stack: [${stack}] | Wants: ${wanted} | Partner: ${partner}`);
    }
    console.log(`Total Exchanges: ${this.totalExchanges}`);
    console.log(`Potential Function Φ: ${this.calculatePotentialFunction()}`);
  }

  /**
   * Log final state summary
   */
  private logFinalState(): void {
    console.log('\n🎯 FINAL RESULTS:');
    
    let totalFinalBalls = 0;
    const finalColorCounts = new Map<Color, number>();
    
    for (const process of this.processes) {
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
    for (const message of this.messageQueue) {
      if (message.type === 'SEND' && message.color) {
        ballsInTransit++;
      }
    }
    
    console.log(`\n📊 Algorithm completed with ${this.totalExchanges} total ball exchanges`);
    console.log(`📉 Final potential function Φ: ${this.calculatePotentialFunction()}`);
    console.log(`📊 Final ball count: ${totalFinalBalls} balls (${ballsInTransit} in transit)`);
    console.log(`📊 Final color distribution: ${Array.from(finalColorCounts.entries()).map(([c, n]) => `${n} ${c}`).join(', ')}`);
    
    if (totalFinalBalls + ballsInTransit !== 30) {
      console.error(`❌ CRITICAL ERROR: Ball count mismatch! Expected 30 total, found ${totalFinalBalls + ballsInTransit} (${totalFinalBalls} in processes + ${ballsInTransit} in transit)`);
    }
  }

  /**
   * Validate that total ball count is preserved (conservation invariant)
   */
  private validateBallConservation(): boolean {
    const currentCounts = new Map<Color, number>();
    let totalBalls = 0;
    
    // Count balls in all process stacks
    for (const process of this.processes) {
      totalBalls += process.stack.length;
      for (const color of process.stack) {
        currentCounts.set(color, (currentCounts.get(color) || 0) + 1);
      }
    }
    
    // Count balls in transit (in message queue)
    for (const message of this.messageQueue) {
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
}
