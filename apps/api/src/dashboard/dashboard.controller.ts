import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('executive')
  async getExecutive(@GetUser() user: JwtPayload, @Query() query: any) {
    return this.service.getExecutive(user, query);
  }

  @Get('charts')
  async getCharts(@GetUser() user: JwtPayload, @Query() query: any) {
    return this.service.getCharts(user, query);
  }

  @Get('supervisor')
  async getSupervisor(@GetUser() user: JwtPayload, @Query() query: any) {
    return this.service.getSupervisor(user, query);
  }

  @Get('comparison')
  async getComparison(@GetUser() user: JwtPayload, @Query() query: any) {
    return this.service.getPeriodComparison(user, query);
  }

  @Get('evaluation-flow/:employeeId')
  async getEvaluationFlow(@GetUser() user: JwtPayload, @Param('employeeId') employeeId: string, @Query('period') period?: string) {
    return this.service.getEvaluationDataFlow(user, employeeId, period);
  }
}
