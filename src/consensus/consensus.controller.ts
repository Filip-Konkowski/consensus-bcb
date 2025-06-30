import { 
  Controller, 
  Get, 
  Post, 
  Logger, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { SystemState } from './types';

/**
 * REST API Controller for the Consensus Algorithm
 * Provides endpoints to control and monitor the ball sorting process
 */
@Controller('consensus')
export class ConsensusController {
  private readonly logger = new Logger(ConsensusController.name);

  constructor(private readonly consensusService: ConsensusService) {}

  /**
   * Start the consensus algorithm
   */
  @Post('start')
  async startConsensus(): Promise<{ message: string; started: boolean }> {
    try {
      this.logger.log('Starting consensus algorithm via REST API');
      
      // Start the algorithm in the background
      this.consensusService.startConsensus().catch(error => {
        this.logger.error('Consensus algorithm error:', error);
      });
      
      return {
        message: 'Consensus algorithm started',
        started: true
      };
    } catch (error) {
      this.logger.error('Error starting consensus:', error);
      throw new HttpException(
        'Failed to start consensus algorithm',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Reset the system to initial state
   */
  @Post('reset')
  resetSystem(): { message: string; reset: boolean } {
    this.logger.log('Resetting system via REST API');
    this.consensusService.reset();
    
    return {
      message: 'System reset to initial state',
      reset: true
    };
  }

  /**
   * Get current system state
   */
  @Get('state')
  getSystemState(): SystemState {
    return this.consensusService.getSystemState();
  }

  /**
   * Get system history for analysis
   */
  @Get('history')
  getSystemHistory(): SystemState[] {
    return this.consensusService.getSystemHistory();
  }

  /**
   * Get the potential function value (proves convergence)
   */
  @Get('potential')
  getPotentialFunction(): { value: number; description: string } {
    const phi = this.consensusService.calculatePotentialFunction();
    return {
      value: phi,
      description: 'Total number of miscolored balls across all processes'
    };
  }

  /**
   * Get algorithm information and documentation
   */
  @Get('info')
  getAlgorithmInfo(): object {
    return {
      name: 'Distributed Ball Sorting Consensus Algorithm',
      description: 'A self-stabilizing distributed algorithm for sorting colored balls across independent processes',
      properties: [
        'No global state visibility',
        'One ball per message constraint',
        'Local decision making only',
        'Guaranteed convergence via potential function',
        'Self-stabilizing behavior'
      ],
      rules: [
        'Processes start without knowledge of others\' balls',
        'Can only request/send one ball at a time',
        'Process exits when it has all balls of single color',
        'Uses round-robin partner selection',
        'Majority color becomes the wanted color'
      ],
      potentialFunction: 'Φ = total number of miscolored balls (decreases with each exchange)',
      references: [
        'Dijkstra\'s self-stabilizing token-ring',
        'Token-based dynamic load-balancing',
        'Locally-greedy self-stabilising algorithms'
      ]
    };
  }
}
