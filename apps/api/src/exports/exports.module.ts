import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExportsController],
  providers: [ExportsService, DataScopeService],
  exports: [ExportsService],
})
export class ExportsModule {}