import { Module } from '@nestjs/common';
import { CriticalIncidentsService } from './critical-incidents.service';
import { CriticalIncidentsController } from './critical-incidents.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [CriticalIncidentsController],
  providers: [CriticalIncidentsService, AuditService, DataScopeService],
  exports: [CriticalIncidentsService],
})
export class CriticalIncidentsModule {}
