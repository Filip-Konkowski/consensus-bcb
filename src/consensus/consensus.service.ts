import { Injectable, Logger } from '@nestjs/common';
import { Color, ProcessId, ProcessState, Message, SystemState, BallExchange } from './types';

/**
 * Distributed Ball Sorting Consensus Algorithm
 * 
 * Based on self-stabilizing distributed algorithms that guarantee convergence
 * without global state knowledge. Each process only knows its own stack and
 * communicates with one partner at a time.
 * 
 * Algorithm Properties:
 * - No global state visibility
 * - One ball per message
 * - Local decision making
 * - Guaranteed convergence using potential function Φ = total miscolored balls
 */
@Injectable()
export class ConsensusService {
  private readonly logger = new Logger(ConsensusService.name);
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

  /**
   * Initialize the three processes with their starting ball distributions
   */
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
    
    this.logger.log('Processes initialized with starting distributions');
    this.saveSystemState();
  }

  /**
   * Start the consensus algorithm
   */
  async startConsensus(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consensus algorithm is already running');
    }

    this.logger.log('🚀 Starting distributed ball sorting consensus algorithm');
    this.isRunning = true;

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

    // Process messages asynchronously until convergence
    while (this.isRunning && !this.isSystemComplete()) {
      await this.processNextMessage();
      await this.sleep(100); // Small delay for visualization
    }

    this.isRunning = false;
    this.logger.log('🎉 Consensus algorithm completed successfully!');
  }

  /**
   * Reset the system to initial state
   */
  reset(): void {
    this.initializeProcesses();
    this.logger.log('System reset to initial state');
  }

  /**
   * Get current system state for UI updates
   */
  getSystemState(): SystemState {
    return {
      processes: this.processes.map(p => ({ ...p })),
      messages: [...this.messageQueue],
      isComplete: this.isSystemComplete(),
      totalExchanges: this.totalExchanges
    };
  }

  /**
   * Get system history for analysis
   */
  getSystemHistory(): SystemState[] {
    return [...this.systemHistory];
  }

  /**
   * Compute the wanted color for a process based on majority rule
   * If tie, use first color seen (top of stack)
   */
  private computeWantedColor(process: ProcessState): void {
    if (process.stack.length === 0) return;

    const colorCounts = new Map<Color, number>();
    for (const color of process.stack) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    let maxCount = 0;
    let wantedColor: Color = process.stack[0];

    for (const [color, count] of colorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        wantedColor = color;
      }
    }

    process.wanted = wantedColor;
    this.logger.debug(`Process ${process.id} wants color ${wantedColor}`);
  }

  /**
   * Choose a partner using round-robin strategy
   */
  private choosePartner(process: ProcessState): void {
    const otherProcesses = this.processes.filter(p => 
      p.id !== process.id && !p.isDone && p.isActive
    );

    if (otherProcesses.length === 0) {
      process.partner = null;
      return;
    }

    // Simple round-robin: choose next available process
    const currentPartnerIndex = process.partner ? 
      otherProcesses.findIndex(p => p.id === process.partner) : -1;
    
    const nextIndex = (currentPartnerIndex + 1) % otherProcesses.length;
    process.partner = otherProcesses[nextIndex].id;

    this.logger.debug(`Process ${process.id} chose partner ${process.partner}`);
  }

  /**
   * Send a REQUEST message to the current partner
   */
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
    this.logger.debug(`Process ${process.id} requests ${process.wanted} from ${process.partner}`);
  }

  /**
   * Process the next message in the queue
   */
  private async processNextMessage(): Promise<void> {
    if (this.messageQueue.length === 0) {
      // If no messages and processes are still active, trigger new requests
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

  /**
   * Handle REQUEST message: check if we have the requested color
   */
  private handleRequest(message: Message, recipient: ProcessState, sender: ProcessState): void {
    if (!message.color || recipient.isDone) return;

    // Find if we have a ball of the requested color that we don't want
    const requestedColor = message.color;
    const ballIndex = recipient.stack.findIndex(color => 
      color === requestedColor && color !== recipient.wanted
    );

    if (ballIndex !== -1) {
      // Remove the ball and send it
      const ballToSend = recipient.stack.splice(ballIndex, 1)[0];
      
      const sendMessage: Message = {
        type: 'SEND',
        from: recipient.id,
        to: sender.id,
        color: ballToSend,
        timestamp: Date.now()
      };

      this.messageQueue.push(sendMessage);
      this.logger.log(`Process ${recipient.id} sending ${ballToSend} to Process ${sender.id}`);

      // Check if recipient is now monochrome
      this.checkMonochrome(recipient);
    }

    // Recipient continues its own protocol
    if (!recipient.isDone) {
      this.computeWantedColor(recipient);
      this.choosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient);
      }
    }
  }

  /**
   * Handle SEND message: receive a ball
   */
  private handleSend(message: Message, recipient: ProcessState, sender: ProcessState): void {
    if (!message.color || recipient.isDone) return;

    recipient.stack.push(message.color);
    this.totalExchanges++;

    this.logger.log(`Process ${recipient.id} received ${message.color} from Process ${sender.id}`);

    // Check if recipient is now monochrome
    this.checkMonochrome(recipient);

    // Continue protocol if not done
    if (!recipient.isDone) {
      this.computeWantedColor(recipient);
      this.choosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient);
      }
    }
  }

  /**
   * Handle DONE message: mark sender as completed
   */
  private handleDone(message: Message, recipient: ProcessState): void {
    const sender = this.processes.find(p => p.id === message.from);
    if (sender) {
      sender.isDone = true;
      sender.isActive = false;
      this.logger.log(`Process ${sender.id} announced completion`);
    }
  }

  /**
   * Check if a process has achieved monochrome state
   */
  private checkMonochrome(process: ProcessState): void {
    if (process.stack.length === 0) return;

    const uniqueColors = new Set(process.stack);
    if (uniqueColors.size === 1) {
      process.isDone = true;
      process.isActive = false;

      // Broadcast DONE message
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

      const color = process.stack[0];
      const count = process.stack.length;
      this.logger.log(`🎯 Process ${process.id} achieved monochrome state: ${count} ${color} balls`);
    }
  }

  /**
   * Trigger new requests for active processes with no pending messages
   */
  private triggerNewRequests(): void {
    for (const process of this.processes) {
      if (!process.isDone && process.isActive) {
        const hasPendingMessages = this.messageQueue.some(m => m.from === process.id);
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

  /**
   * Check if the entire system has reached consensus (all processes monochrome)
   */
  private isSystemComplete(): boolean {
    return this.processes.every(p => p.isDone);
  }

  /**
   * Save current system state to history
   */
  private saveSystemState(): void {
    const state = this.getSystemState();
    this.systemHistory.push(state);
  }

  /**
   * Utility method to add delay for visualization
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate the potential function Φ = total number of miscolored balls
   * This proves convergence as Φ strictly decreases with each successful exchange
   */
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
}
