import { Injectable, Logger } from '@nestjs/common';
import { BaseConsensusService } from './base-consensus.service';
import { ColorSelectionService } from './services/color-selection.service';
import { PartnerSelectionService } from './services/partner-selection.service';
import { MessageHandlingService } from './services/message-handling.service';
import { ValidationService } from './services/validation.service';
import { SystemStateService } from './services/system-state.service';

/**
 * NestJS Consensus Service
 * Extends BaseConsensusService with NestJS dependency injection and logging
 */
@Injectable()
export class ConsensusService extends BaseConsensusService {
  private readonly logger = new Logger(ConsensusService.name);

  constructor(
    colorSelectionService: ColorSelectionService,
    partnerSelectionService: PartnerSelectionService,
    messageHandlingService: MessageHandlingService,
    validationService: ValidationService,
    systemStateService: SystemStateService,
  ) {
    // Call parent constructor with injected services
    super(
      colorSelectionService,
      partnerSelectionService,
      messageHandlingService,
      validationService,
      systemStateService
    );
  }

  protected onProcessesInitialized(): void {
    this.logger.log('Processes initialized with starting distributions');
  }

  protected onConsensusStarting(): void {
    this.logger.log('🚀 Starting distributed ball sorting consensus algorithm');
  }

  protected onInitialProcessStates(): void {
    this.logger.log('--- Initial Process States ---');
  }

  protected onIterationCheck(iterationCount: number): void {
    this.logger.log(`--- Iteration ${iterationCount} - System Check ---`);
  }

  protected onConsensusCompleted(iterationCount: number): void {
    this.logger.log(`🎉 Consensus algorithm completed in ${iterationCount} iterations!`);
  }

  protected onWarning(message: string): void {
    this.logger.warn(message);
  }

  protected onSystemReset(): void {
    this.logger.log('System reset to initial state');
  }
}
