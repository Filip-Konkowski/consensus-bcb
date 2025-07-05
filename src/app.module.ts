import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConsensusController } from './consensus/consensus.controller';

@Module({
  imports: [
    // Serve static files (HTML UI)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
  ],
  controllers: [ConsensusController],
})
export class AppModule {}