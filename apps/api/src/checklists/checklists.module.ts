import { Module } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [ChecklistsController],
  providers: [ChecklistsService, AuditService, DataScopeService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
