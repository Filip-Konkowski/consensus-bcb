import { Module } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { ColorSelectionService } from './services/color-selection.service';
import { PartnerSelectionService } from './services/partner-selection.service';
import { MessageHandlingService } from './services/message-handling.service';
import { ValidationService } from './services/validation.service';
import { SystemStateService } from './services/system-state.service';

@Module({
  providers: [
    ConsensusService,
    ColorSelectionService,
    PartnerSelectionService,
    MessageHandlingService,
    ValidationService,
    SystemStateService,
  ],
  exports: [ConsensusService],
})
export class ConsensusModule {}
