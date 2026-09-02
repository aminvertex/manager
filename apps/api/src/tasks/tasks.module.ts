import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, AuditService, DataScopeService],
  exports: [TasksService],
})
export class TasksModule {}
