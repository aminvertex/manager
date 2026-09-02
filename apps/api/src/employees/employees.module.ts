import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PasswordService } from '../common/services/password.service';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    PasswordService,
    AuditService,
    DataScopeService,
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
