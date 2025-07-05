import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConsensusModule } from './consensus/consensus.module';

@Module({
  imports: [
    // Serve static files (HTML UI)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    ConsensusModule,
  ],
})
export class AppModule {}