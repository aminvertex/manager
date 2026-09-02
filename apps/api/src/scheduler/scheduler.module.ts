import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KpiModule } from '../kpi/kpi.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, KpiModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
