import { 
  Controller, 
  Get, 
  Post, 
  Logger, 
  HttpException, 
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConsensusService } from './consensus.service';

/**
 * REST API Controller for the Consensus Algorithm
 * Provides endpoints to control and monitor the ball sorting process
 */
@ApiTags('consensus')
@Controller('consensus')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(private readonly consensusService: ConsensusService) {}

  /**
   * Start the consensus algorithm
   */
  @Post('start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start the consensus algorithm' })
  @ApiResponse({ status: 200, description: 'Consensus algorithm started successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async startConsensus(): Promise<{ message: string; started: boolean }> {
    try {
      this.logger.log('Starting consensus algorithm via REST API');
      
      // Start the real consensus algorithm
      await this.consensusService.startConsensus();
      
      return {
        message: 'Consensus algorithm completed',
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset the system to initial state' })
  @ApiResponse({ status: 200, description: 'System reset successfully' })
  reset(): { message: string; reset: boolean } {
    this.logger.log('Resetting system via REST API');
    
    // Reset the real consensus service
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
  @ApiOperation({ summary: 'Get current system state' })
  @ApiResponse({ status: 200, description: 'Current system state' })
  getState(): any {
    return this.consensusService.getSystemState();
  }

  /**
   * Get system history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get system history' })
  @ApiResponse({ status: 200, description: 'System history' })
  getHistory(): any[] {
    return this.consensusService.getSystemHistory();
  }

  /**
   * Get current potential function value
   */
  @Get('potential')
  @ApiOperation({ summary: 'Get current potential function value' })
  @ApiResponse({ status: 200, description: 'Current potential function value' })
  getPotentialFunction(): { value: number; description: string } {
    return {
      value: this.consensusService.calculatePotentialFunction(),
      description: 'Total number of miscolored balls across all processes'
    };
  }

  /**
   * Get algorithm information
   */
  @Get('info')
  @ApiOperation({ summary: 'Get algorithm information' })
  @ApiResponse({ status: 200, description: 'Algorithm information' })
  getInfo(): any {
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