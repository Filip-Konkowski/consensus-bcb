import { Module } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { ConsensusController } from './consensus.controller';

/**
 * Consensus Module
 * Encapsulates the distributed ball sorting consensus algorithm
 */
@Module({
  providers: [ConsensusService],
  controllers: [ConsensusController],
  exports: [ConsensusService],
})
export class ConsensusModule {}
