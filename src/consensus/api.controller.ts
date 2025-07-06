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

/**
 * REST API Controller for the Consensus Algorithm
 * Provides endpoints to control and monitor the ball sorting process
 */
@ApiTags('consensus')
@Controller('consensus')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  // Simple mock state for now (until we fix the complex ConsensusService)
  private mockState = {
    processes: [
      { id: 1, stack: ['R','R','R','G','G','G','B','B','B','R'], wanted: 'R', partner: null, isDone: false },
      { id: 2, stack: ['G','G','G','R','R','B','B','B','R','R'], wanted: 'G', partner: null, isDone: false },
      { id: 3, stack: ['B','B','B','B','R','G','G','G','G','R'], wanted: 'B', partner: null, isDone: false }
    ],
    messageQueue: [],
    totalExchanges: 0,
    isComplete: false,
    potentialFunction: 15
  };

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
      this.logger.log('🚀 Starting consensus algorithm via REST API');
      
      // Simulate algorithm running
      setTimeout(() => {
        this.logger.log('🎉 Consensus algorithm completed (simulated)');
        this.mockState.isComplete = true;
        this.mockState.potentialFunction = 0;
        // Simulate final state - each process has balls of one color
        this.mockState.processes = [
          { id: 1, stack: ['R','R','R','R','R','R','R','R','R','R'], wanted: 'R', partner: null, isDone: true },
          { id: 2, stack: ['G','G','G','G','G','G','G','G','G','G'], wanted: 'G', partner: null, isDone: true },
          { id: 3, stack: ['B','B','B','B','B','B','B','B','B','B'], wanted: 'B', partner: null, isDone: true }
        ];
      }, 2000);
      
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset the system to initial state' })
  @ApiResponse({ status: 200, description: 'System reset successfully' })
  reset(): { message: string; reset: boolean } {
    this.logger.log('🔄 Resetting system via REST API');
    
    // Reset mock state
    this.mockState = {
      processes: [
        { id: 1, stack: ['R','R','R','G','G','G','B','B','B','R'], wanted: 'R', partner: null, isDone: false },
        { id: 2, stack: ['G','G','G','R','R','B','B','B','R','R'], wanted: 'G', partner: null, isDone: false },
        { id: 3, stack: ['B','B','B','B','R','G','G','G','G','R'], wanted: 'B', partner: null, isDone: false }
      ],
      messageQueue: [],
      totalExchanges: 0,
      isComplete: false,
      potentialFunction: 15
    };
    
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
    return this.mockState;
  }

  /**
   * Get system history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get system history' })
  @ApiResponse({ status: 200, description: 'System history' })
  getHistory(): any[] {
    return [this.mockState]; // Return current state as history for now
  }

  /**
   * Get current potential function value
   */
  @Get('potential')
  @ApiOperation({ summary: 'Get current potential function value' })
  @ApiResponse({ status: 200, description: 'Current potential function value' })
  getPotentialFunction(): { value: number; description: string } {
    return {
      value: this.mockState.potentialFunction,
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