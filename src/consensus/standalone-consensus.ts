import { BaseConsensusService } from './base-consensus.service';
import {
  ColorSelectionService,
  PartnerSelectionService,
  MessageHandlingService,
  ValidationService,
  SystemStateService
} from './services';

/**
 * Standalone Consensus Service for Testing
 * (Without NestJS dependencies)
 */
export class StandaloneConsensusService extends BaseConsensusService {
  constructor() {
    console.log('Starting standalone consensus service');
    
    // Create services manually for standalone usage
    const colorSelectionService = new ColorSelectionService();
    const partnerSelectionService = new PartnerSelectionService(colorSelectionService);
    const messageHandlingService = new MessageHandlingService();
    const validationService = new ValidationService();
    const systemStateService = new SystemStateService();

    // Pass services to base constructor
    super(
      colorSelectionService,
      partnerSelectionService,
      messageHandlingService,
      validationService,
      systemStateService
    );
  }
}
