import { Injectable } from '@nestjs/common';
import { Color, ProcessId, ProcessState, Message, SystemState } from './types';
import {
  ColorSelectionService,
  PartnerSelectionService,
  MessageHandlingService,
  ValidationService,
  SystemStateService
} from './services';

/**
 * Base Consensus Service Implementation
 * Contains the core algorithm logic, injectable by NestJS
 */
@Injectable()
export class BaseConsensusService {
  protected processes: ProcessState[] = [];
  protected messageQueue: Message[] = [];
  protected systemHistory: SystemState[] = [];
  protected totalExchanges = 0;
  protected isRunning = false;

  // Service dependencies
  protected colorSelectionService: ColorSelectionService;
  protected partnerSelectionService: PartnerSelectionService;
  protected messageHandlingService: MessageHandlingService;
  protected validationService: ValidationService;
  protected systemStateService: SystemStateService;

  // Initial ball distributions - can be customized
  protected initialDistributions: Record<ProcessId, Color[]> = {
    1: ["R","R","R","G","G","G","B","B","B","R"],
    2: ["G","G","G","R","R","B","B","B","R","R"],
    3: ["B","B","B","B","R","G","G","G","G","R"]
  };

  constructor(
    colorSelectionService: ColorSelectionService,
    partnerSelectionService: PartnerSelectionService,
    messageHandlingService: MessageHandlingService,
    validationService: ValidationService,
    systemStateService: SystemStateService
  ) {
    // Inject services instead of creating them
    this.colorSelectionService = colorSelectionService;
    this.partnerSelectionService = partnerSelectionService;
    this.messageHandlingService = messageHandlingService;
    this.validationService = validationService;
    this.systemStateService = systemStateService;
    
    this.initializeProcesses();
  }

  /**
   * Set custom color distributions for processes
   */
  setCustomDistributions(distributions: Record<ProcessId, Color[]>): void {
    this.initialDistributions = { ...distributions };
  }

  /**
   * Initialize processes with their starting ball distributions
   * Dynamically creates processes based on available distributions
   */
  protected initializeProcesses(): void {
    this.processes = [];
    
    // Create processes dynamically based on available distributions
    for (const [processIdStr, distribution] of Object.entries(this.initialDistributions)) {
      const processId = parseInt(processIdStr) as ProcessId;
      this.processes.push({
        id: processId,
        stack: [...distribution],
        wanted: null,
        partner: null,
        isDone: false
      });
    }

    this.messageQueue = [];
    this.totalExchanges = 0;
    this.isRunning = false;
    this.systemHistory = [];
    
    this.systemStateService.saveSystemState(this.processes, this.messageQueue, this.totalExchanges, this.systemHistory);
    this.onProcessesInitialized();
  }

  /**
   * Hook for logging when processes are initialized
   * Override in subclasses for framework-specific logging
   */
  protected onProcessesInitialized(): void {
    // Default: no-op, override in subclasses
  }

  /**
   * Hook for logging start of consensus
   * Override in subclasses for framework-specific logging
   */
  protected onConsensusStarting(): void {
    console.log('🚀 Starting distributed ball sorting consensus algorithm');
  }

  /**
   * Hook for logging initial process states
   * Override in subclasses for framework-specific logging
   */
  protected onInitialProcessStates(): void {
    console.log('\n--- Initial Process States ---');
  }

  /**
   * Hook for logging iteration checks
   * Override in subclasses for framework-specific logging
   */
  protected onIterationCheck(iterationCount: number): void {
    console.log(`\n--- Iteration ${iterationCount} - System Check ---`);
  }

  /**
   * Hook for logging consensus completion
   * Override in subclasses for framework-specific logging
   */
  protected onConsensusCompleted(iterationCount: number): void {
    console.log(`\n🎉 Consensus algorithm completed in ${iterationCount} iterations!`);
  }

  /**
   * Hook for logging warnings
   * Override in subclasses for framework-specific logging
   */
  protected onWarning(message: string): void {
    console.warn(message);
  }

  /**
   * Hook for logging system reset
   * Override in subclasses for framework-specific logging
   */
  protected onSystemReset(): void {
    // Default: no-op, override in subclasses
  }

  /**
   * Start the consensus algorithm
   */
  async startConsensus(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consensus algorithm is already running');
    }

    this.onConsensusStarting();
    this.isRunning = true;
    let iterationCount = 0;

    // Each process computes its initial wanted color and starts the protocol
    for (const process of this.processes) {
      if (!process.isDone) {
        this.colorSelectionService.computeWantedColor(process, this.messageQueue);
        this.partnerSelectionService.choosePartner(process, this.processes);
        if (process.partner) {
          this.messageHandlingService.sendRequest(process, this.messageQueue);
        }
      }
    }

    this.onInitialProcessStates();
    this.validationService.logSystemState(this.processes, this.totalExchanges, () => this.calculatePotentialFunction());
    this.colorSelectionService.detectColorConflicts(this.processes);
    this.validationService.validateBallConservation(this.processes, this.messageQueue, this.initialDistributions);

    // Process messages asynchronously until convergence
    while (this.isRunning && !this.systemStateService.isSystemComplete(this.processes, this.messageQueue)) {
      await this.processNextMessage();
      iterationCount++;
      
      // Periodically check for conflicts and resolve them
      if (iterationCount % 10 === 0) {
        this.onIterationCheck(iterationCount);
        this.colorSelectionService.detectColorConflicts(this.processes);
        this.colorSelectionService.resolveColorConflicts(this.processes);
        this.validationService.logSystemState(this.processes, this.totalExchanges, () => this.calculatePotentialFunction());
        this.validationService.validateBallConservation(this.processes, this.messageQueue, this.initialDistributions);
      }
      
      await this.systemStateService.sleep(50); // Delay for better visualization
      
      // Safety check to prevent infinite loops
      if (iterationCount > 500) {
        this.onWarning('⚠️ Algorithm taking too long, forcing resolution');
        this.colorSelectionService.resolveColorConflicts(this.processes);
        break;
      }
    }

    this.isRunning = false;
    this.onConsensusCompleted(iterationCount);
    this.validationService.validateBallConservation(this.processes, this.messageQueue, this.initialDistributions);
    this.validationService.logFinalState(this.processes, this.messageQueue, this.totalExchanges, () => this.calculatePotentialFunction(), this.initialDistributions);
  }

  reset(): void;
  reset(customDistributions: Record<ProcessId, Color[]>): void;
  reset(customDistributions?: Record<ProcessId, Color[]>): void {
    if (customDistributions) {
      this.setCustomDistributions(customDistributions);
    }
    this.initializeProcesses();
    this.onSystemReset();
  }

  getSystemState(): SystemState {
    return this.systemStateService.createSystemState(this.processes, this.messageQueue, this.totalExchanges);
  }

  getSystemHistory(): SystemState[] {
    return [...this.systemHistory];
  }

  calculatePotentialFunction(): number {
    return this.systemStateService.calculatePotentialFunction(this.processes);
  }

  /**
   * Process the next message in the queue
   */
  private async processNextMessage(): Promise<void> {
    if (this.messageQueue.length === 0) {
      this.messageHandlingService.triggerNewRequests(
        this.processes, 
        this.messageQueue,
        (process) => this.colorSelectionService.computeWantedColor(process, this.messageQueue),
        (process) => this.partnerSelectionService.choosePartner(process, this.processes)
      );
      return;
    }

    const message = this.messageQueue.shift()!;
    const recipient = this.processes.find(p => p.id === message.to);
    const sender = this.processes.find(p => p.id === message.from);

    if (!recipient || !sender) return;

    const totalExchangesRef = { count: this.totalExchanges };

    switch (message.type) {
      case 'REQUEST':
        this.messageHandlingService.handleRequest(
          message, 
          recipient, 
          sender,
          this.messageQueue,
          (process) => this.messageHandlingService.checkMonochrome(process, this.processes, this.messageQueue),
          (process) => this.colorSelectionService.computeWantedColor(process, this.messageQueue),
          (process) => this.partnerSelectionService.choosePartner(process, this.processes)
        );
        break;
      case 'SEND':
        this.messageHandlingService.handleSend(
          message, 
          recipient, 
          sender,
          totalExchangesRef,
          (process) => this.messageHandlingService.checkMonochrome(process, this.processes, this.messageQueue),
          (process) => this.colorSelectionService.computeWantedColor(process, this.messageQueue),
          (process) => this.partnerSelectionService.choosePartner(process, this.processes),
          this.messageQueue
        );
        this.totalExchanges = totalExchangesRef.count;
        break;
      case 'DONE':
        this.messageHandlingService.handleDone(message, this.processes);
        break;
    }

    this.systemStateService.saveSystemState(this.processes, this.messageQueue, this.totalExchanges, this.systemHistory);
  }
}
