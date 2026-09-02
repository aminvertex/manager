import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, AuditService, DataScopeService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
