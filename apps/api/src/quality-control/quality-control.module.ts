import { Module } from '@nestjs/common';
import { QualityControlService } from './quality-control.service';
import { QualityControlController } from './quality-control.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [QualityControlController],
  providers: [QualityControlService, AuditService, DataScopeService],
  exports: [QualityControlService],
})
export class QualityControlModule {}
