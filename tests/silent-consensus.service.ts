import {Injectable} from "@nestjs/common";
import {BaseConsensusService} from "../src/consensus/base-consensus.service";
import {
  ColorSelectionService,
  LoggingSystemService,
  MessageHandlingService,
  PartnerSelectionService, SystemStateService
} from "../src/consensus/services";
import {Color, ProcessId} from "../src/consensus/types";

/**
 * Silent Consensus Service for Testing
 * Extends BaseConsensusService but suppresses all console output for cleaner test runs
 */
@Injectable()
export class SilentConsensusService extends BaseConsensusService {
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private silenceActive: boolean = false;

  constructor(
    colorSelectionService: ColorSelectionService,
    partnerSelectionService: PartnerSelectionService,
    messageHandlingService: MessageHandlingService,
    validationService: LoggingSystemService,
    systemStateService: SystemStateService
  ) {
    super(
      colorSelectionService,
      partnerSelectionService,
      messageHandlingService,
      validationService,
      systemStateService
    );

    // Store original console methods
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;

    // Start silent mode immediately
    this.startSilentMode();
  }

  /**
   * Start silent mode - suppress all console output
   */
  private startSilentMode(): void {
    if (!this.silenceActive) {
      console.log = () => {};
      console.error = () => {};
      console.warn = () => {};
      this.silenceActive = true;
    }
  }

  /**
   * Stop silent mode - restore console output
   */
  private stopSilentMode(): void {
    if (this.silenceActive) {
      console.log = this.originalConsoleLog;
      console.error = this.originalConsoleError;
      console.warn = this.originalConsoleWarn;
      this.silenceActive = false;
    }
  }

  /**
   * Override all console output hooks to be silent
   */
  protected onConsensusStarting(): void {
    // Silent - no output
  }

  protected onInitialProcessStates(): void {
    // Silent - no output
  }

  protected onIterationCheck(iterationCount: number): void {
    // Silent - no output
  }

  protected onConsensusCompleted(iterationCount: number): void {
    // Silent - no output
  }

  protected onWarning(message: string): void {
    // Silent - no output
  }

  protected onSystemReset(): void {
    // Silent - no output
  }

  /**
   * Override the consensus start method to ensure silence
   */
  async startConsensus(): Promise<void> {
    this.startSilentMode();
    try {
      await super.startConsensus();
    } finally {
      // Keep silent mode active
    }
  }

  /**
   * Override reset to ensure silence
   */
  reset(customDistributions?: Record<ProcessId, Color[]>): void {
    this.startSilentMode();
    try {
      if (customDistributions) {
        super.reset(customDistributions);
      } else {
        super.reset();
      }
    } finally {
      // Keep silent mode active
    }
  }

  /**
   * Method to restore console output when the service is destroyed
   */
  destroy(): void {
    this.stopSilentMode();
  }
}
