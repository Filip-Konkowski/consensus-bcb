import { Color, ProcessId, ProcessState, Message, SystemState } from '../src/consensus/types';

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
      await this.sleep(10); // Small delay for testing
    }

    this.isRunning = false;
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

    let maxCount = 0;
    let wantedColor: Color = process.stack[0];

    for (const [color, count] of colorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        wantedColor = color;
      }
    }

    process.wanted = wantedColor;
  }

  private choosePartner(process: ProcessState): void {
    const otherProcesses = this.processes.filter(p => 
      p.id !== process.id && !p.isDone && p.isActive
    );

    if (otherProcesses.length === 0) {
      process.partner = null;
      return;
    }

    const currentPartnerIndex = process.partner ? 
      otherProcesses.findIndex(p => p.id === process.partner) : -1;
    
    const nextIndex = (currentPartnerIndex + 1) % otherProcesses.length;
    process.partner = otherProcesses[nextIndex].id;
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
    if (!message.color || recipient.isDone) return;

    const requestedColor = message.color;
    const ballIndex = recipient.stack.findIndex(color => 
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
      this.checkMonochrome(recipient);
    }

    if (!recipient.isDone) {
      this.computeWantedColor(recipient);
      this.choosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient);
      }
    }
  }

  private handleSend(message: Message, recipient: ProcessState, sender: ProcessState): void {
    if (!message.color || recipient.isDone) return;

    recipient.stack.push(message.color);
    this.totalExchanges++;

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

  private isSystemComplete(): boolean {
    return this.processes.every(p => p.isDone);
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
}
