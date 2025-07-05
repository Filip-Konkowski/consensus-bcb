import { Module } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { BaseConsensusService } from './base-consensus.service';
import { ApiController } from './api.controller';
import { ColorSelectionService } from './services/color-selection.service';
import { PartnerSelectionService } from './services/partner-selection.service';
import { MessageHandlingService } from './services/message-handling.service';
import { ValidationService } from './services/validation.service';
import { SystemStateService } from './services/system-state.service';

@Module({
  controllers: [ApiController],
  providers: [
    ConsensusService,
    BaseConsensusService,
    ColorSelectionService,
    PartnerSelectionService,
    MessageHandlingService,
    ValidationService,
    SystemStateService,
  ],
  exports: [
    ConsensusService,
    BaseConsensusService,
    ColorSelectionService,
    PartnerSelectionService,
    MessageHandlingService,
    ValidationService,
    SystemStateService,
  ],
})
export class ConsensusModule {}
