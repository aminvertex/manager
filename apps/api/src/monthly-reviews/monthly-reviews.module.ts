import { Module } from '@nestjs/common';
import { MonthlyReviewsService } from './monthly-reviews.service';
import { MonthlyReviewsController } from './monthly-reviews.controller';
import { KpiService } from '../kpi/kpi.service';

@Module({
  controllers: [MonthlyReviewsController],
  providers: [MonthlyReviewsService, KpiService],
  exports: [MonthlyReviewsService],
})
export class MonthlyReviewsModule {}
