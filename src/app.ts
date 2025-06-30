import express, { Request, Response } from 'express';
import { algorithmRoutes } from './routes/algorithms';
import { NestFactory } from '@nestjs/core';
import { ConsensusModule } from './consensus/consensus.module';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for the consensus UI
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/algorithms', algorithmRoutes);

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
      consensus: '/consensus',
      ui: '/ (Consensus Algorithm UI)'
    }
  });
});

// Initialize NestJS consensus module
async function setupNestJS() {
  const nestApp = await NestFactory.create(ConsensusModule);
  nestApp.enableCors();
  
  // Mount NestJS routes under /consensus
  const nestExpressApp = nestApp.getHttpAdapter().getInstance();
  app.use('/consensus', nestExpressApp._router);
  
  return nestApp;
}

// Start server
async function bootstrap() {
  try {
    // Setup NestJS integration
    await setupNestJS();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📚 Algorithm solving environment ready!`);
      console.log(`🎯 Consensus Algorithm UI available at http://localhost:${PORT}`);
      console.log(`📊 REST API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

// Start the application
bootstrap();

export default app;
