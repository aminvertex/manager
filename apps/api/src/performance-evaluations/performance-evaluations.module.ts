import { Module } from '@nestjs/common';
import { PerformanceEvaluationsService } from './performance-evaluations.service';
import { PerformanceEvaluationsController } from './performance-evaluations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [PerformanceEvaluationsController],
  providers: [PerformanceEvaluationsService],
  imports: [PrismaModule],
  exports: [PerformanceEvaluationsService],
})
export class PerformanceEvaluationsModule {}
