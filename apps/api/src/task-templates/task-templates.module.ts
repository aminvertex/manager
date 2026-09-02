import { Module } from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service';
import { TaskTemplatesController } from './task-templates.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService, AuditService],
  exports: [TaskTemplatesService],
})
export class TaskTemplatesModule {}
