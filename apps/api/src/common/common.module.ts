import { Global, Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { AppLoggerService } from './services/app-logger.service';
import { PermissionService } from './services/permission.service';

@Global()
@Module({
  providers: [StorageService, AppLoggerService, PermissionService],
  exports: [StorageService, AppLoggerService, PermissionService],
})
export class CommonModule {}
