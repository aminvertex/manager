import { Module } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService, AuditService, DataScopeService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
