import { Module } from '@nestjs/common';
import { BaseConsensusService } from './base-consensus.service';
import { ConsensusService } from './consensus.service';
import { ApiController } from './api.controller';
import { ColorSelectionService } from './services/color-selection.service';
import { PartnerSelectionService } from './services/partner-selection.service';
import { MessageHandlingService } from './services/message-handling.service';
import { LoggingSystemService } from './services/logging-system.service';
import { SystemStateService } from './services/system-state.service';

@Module({
  controllers: [ApiController],
  providers: [
    BaseConsensusService,
    ConsensusService,
    ColorSelectionService,
    PartnerSelectionService,
    MessageHandlingService,
    LoggingSystemService,
    SystemStateService,
  ],
  exports: [
    BaseConsensusService,
    ConsensusService,
    ColorSelectionService,
    PartnerSelectionService,
    MessageHandlingService,
    LoggingSystemService,
    SystemStateService,
  ],
})
export class ConsensusModule {}
