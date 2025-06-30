import { NestFactory } from '@nestjs/core';
import { ConsensusModule } from './consensus/consensus.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ConsensusModule);
  
  // Enable CORS for Angular frontend
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  Logger.log(`🚀 Consensus server running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📊 Ball sorting consensus algorithm ready!`, 'Bootstrap');
}

bootstrap();
