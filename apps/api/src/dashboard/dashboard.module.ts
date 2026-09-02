import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { KpiService } from '../kpi/kpi.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, KpiService],
  exports: [DashboardService],
})
export class DashboardModule {}
