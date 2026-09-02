import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [TrainingController],
  providers: [TrainingService, AuditService, DataScopeService],
  exports: [TrainingService],
})
export class TrainingModule {}