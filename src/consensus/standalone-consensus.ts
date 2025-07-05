import { BaseConsensusService } from './base-consensus.service';

/**
 * Standalone Consensus Service for Testing
 * (Without NestJS dependencies)
 */
export class StandaloneConsensusService extends BaseConsensusService {
  constructor() {
    console.log('Starting standalone consensus service');
    super();
  }
}
