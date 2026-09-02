import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '@amatis/types';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private service: SchedulerService) {}

  @Post('monthly-report')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async generateMonthly(@Query('period') period?: string) {
    return { success: true, data: await this.service.generateMonthlyReport(period) };
  }
}
