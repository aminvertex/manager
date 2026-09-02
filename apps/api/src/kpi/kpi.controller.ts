import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '@amatis/types';
import { KpiService } from './kpi.service';

@ApiTags('kpi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kpi')
export class KpiController {
  constructor(private service: KpiService) {}

  @Get('weights')
  async getWeights() {
    return this.service.getWeights();
  }

  @Post('weights')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async saveWeights(@Body() weights: Record<string, number>) {
    return this.service.saveWeights(weights);
  }

  @Get('project-weights/:projectId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async getProjectWeights(@Param('projectId') projectId: string) {
    return this.service.getProjectWeights(projectId);
  }

  @Post('project-weights/:projectId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async saveProjectWeights(@Param('projectId') projectId: string, @Body() weights: Record<string, number>) {
    return this.service.saveProjectWeights(projectId, weights);
  }

  @Get('project-weights')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async getProjectWeightSummary() {
    return this.service.getProjectWeightSummary();
  }

  @Post('recalculate/:employeeId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  async recalculate(@Param('employeeId') employeeId: string, @Query('period') period?: string) {
    return this.service.recalculateForEmployee(employeeId, period);
  }

  @Get('trend/:employeeId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.EMPLOYEE)
  async getTrend(@Param('employeeId') employeeId: string, @Query('months') months?: string) {
    return this.service.getTrend(employeeId, months ? Number(months) : 6);
  }

  @Get('ranking')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  async getRanking(@Query('period') period?: string) {
    return this.service.getRanking(period);
  }

  @Post('recalculate-all')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async recalculateAll(@Query('period') period?: string) {
    return this.service.recalculateAll(period);
  }
}
