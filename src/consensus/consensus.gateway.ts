import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConsensusService } from './consensus.service';

/**
 * WebSocket Gateway for real-time communication with Angular frontend
 * Provides live updates of the consensus algorithm progress
 */
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ConsensusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConsensusGateway.name);

  constructor(private readonly consensusService: ConsensusService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send current system state to newly connected client
    const systemState = this.consensusService.getSystemState();
    client.emit('systemState', systemState);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('startConsensus')
  async handleStartConsensus(): Promise<void> {
    try {
      this.logger.log('Starting consensus algorithm via WebSocket');
      
      // Start the algorithm and emit updates
      const promise = this.consensusService.startConsensus();
      
      // Emit periodic updates during execution
      const interval = setInterval(() => {
        const systemState = this.consensusService.getSystemState();
        this.server.emit('systemState', systemState);
        
        if (systemState.isComplete) {
          clearInterval(interval);
          this.server.emit('consensusComplete', {
            message: 'Consensus algorithm completed successfully!',
            totalExchanges: systemState.totalExchanges,
            finalState: systemState
          });
        }
      }, 200);

      await promise;
      clearInterval(interval);
      
    } catch (error) {
      this.logger.error('Error starting consensus:', error);
      this.server.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('resetSystem')
  handleResetSystem(): void {
    this.logger.log('Resetting system via WebSocket');
    this.consensusService.reset();
    
    const systemState = this.consensusService.getSystemState();
    this.server.emit('systemState', systemState);
    this.server.emit('systemReset', { message: 'System reset to initial state' });
  }

  @SubscribeMessage('getSystemState')
  handleGetSystemState(client: Socket): void {
    const systemState = this.consensusService.getSystemState();
    client.emit('systemState', systemState);
  }

  @SubscribeMessage('getSystemHistory')
  handleGetSystemHistory(client: Socket): void {
    const history = this.consensusService.getSystemHistory();
    client.emit('systemHistory', history);
  }

  @SubscribeMessage('getPotentialFunction')
  handleGetPotentialFunction(client: Socket): void {
    const phi = this.consensusService.calculatePotentialFunction();
    client.emit('potentialFunction', { value: phi });
  }
}
