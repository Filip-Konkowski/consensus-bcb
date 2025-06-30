import express, { Request, Response } from 'express';
import { algorithmRoutes } from './routes/algorithms';
import { StandaloneConsensusService } from './consensus/standalone-consensus';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Create a single instance of the consensus service
const consensusService = new StandaloneConsensusService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for the consensus UI
app.use(express.static(path.join(__dirname, '../public')));

// Routes for original algorithms
app.use('/api/algorithms', algorithmRoutes);

// Consensus API endpoints
app.post('/consensus/start', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting consensus algorithm via REST API');
    
    // Start the algorithm in the background
    consensusService.startConsensus().catch(error => {
      console.error('Consensus algorithm error:', error);
    });
    
    res.json({
      message: 'Consensus algorithm started',
      started: true
    });
  } catch (error) {
    console.error('Error starting consensus:', error);
    res.status(500).json({ error: 'Failed to start consensus algorithm' });
  }
});

app.post('/consensus/reset', (req: Request, res: Response) => {
  console.log('🔄 Resetting system via REST API');
  consensusService.reset();
  
  res.json({
    message: 'System reset to initial state',
    reset: true
  });
});

app.get('/consensus/state', (req: Request, res: Response) => {
  const state = consensusService.getSystemState();
  res.json(state);
});

app.get('/consensus/history', (req: Request, res: Response) => {
  const history = consensusService.getSystemHistory();
  res.json(history);
});

app.get('/consensus/potential', (req: Request, res: Response) => {
  const phi = consensusService.calculatePotentialFunction();
  res.json({
    value: phi,
    description: 'Total number of miscolored balls across all processes'
  });
});

app.get('/consensus/info', (req: Request, res: Response) => {
  res.json({
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
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Algorithm solving server is running!' });
});

// Root endpoint - serve the consensus algorithm UI
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Algorithm Solver API',
    endpoints: {
      health: '/health',
      algorithms: '/api/algorithms',
      consensus: '/consensus/*',
      ui: '/ (Consensus Algorithm UI)'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 Algorithm solving environment ready!`);
  console.log(`🎯 Consensus Algorithm UI available at http://localhost:${PORT}`);
  console.log(`📊 REST API available at http://localhost:${PORT}/api`);
  console.log(`🔗 Consensus API available at http://localhost:${PORT}/consensus`);
});

export default app;
