import { Module } from '@nestjs/common';
import { PsychometricService } from './psychometric.service';
import { PsychometricController } from './psychometric.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [PsychometricController],
  providers: [PsychometricService, AuditService, DataScopeService],
  exports: [PsychometricService],
})
export class PsychometricModule {}
