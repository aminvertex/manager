import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoleCode } from '@amatis/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { ChecklistsService } from './checklists.service';
import { SubmitDailyChecklistDto, SubmitWeeklyChecklistDto, ChecklistQueryDto } from './dto/checklist.dto';

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private service: ChecklistsService) {}

  @Post('daily/:employeeId')
  submitDaily(@Param('employeeId') employeeId: string, @Body() dto: SubmitDailyChecklistDto, @GetUser() user: JwtPayload) {
    return this.service.submitDaily(employeeId, dto, user);
  }

  @Get('daily/:employeeId')
  getDaily(@Param('employeeId') employeeId: string, @GetUser() user: JwtPayload, @Query() query: ChecklistQueryDto) {
    return this.service.getDaily(employeeId, user, query);
  }

  @Post('weekly/:employeeId')
  submitWeekly(@Param('employeeId') employeeId: string, @Body() dto: SubmitWeeklyChecklistDto, @GetUser() user: JwtPayload) {
    return this.service.submitWeekly(employeeId, dto, user);
  }

  @Get('weekly/:employeeId')
  getWeekly(@Param('employeeId') employeeId: string, @GetUser() user: JwtPayload) {
    return this.service.getWeekly(employeeId, user);
  }

  @Get('schedule')
  getSchedule() {
    return this.service.getSchedule();
  }

  @Get('overview')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  getOverview(
    @Query('type') type: 'daily' | 'weekly',
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('employeeId') employeeId: string,
    @GetUser() user: JwtPayload,
  ) {
    return this.service.getAdminOverview(type === 'weekly' ? 'weekly' : 'daily', from, to, user, employeeId);
  }
}
