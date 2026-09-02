import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { PerformanceEvaluationsService } from './performance-evaluations.service';
import { CreateEvaluationDto, UpdateEvaluationDto } from './dto/create-evaluation.dto';

@Controller('performance-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceEvaluationsController {
  constructor(private service: PerformanceEvaluationsService) {}

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  create(@Body() dto: CreateEvaluationDto, @GetUser() user: any) {
    return this.service.upsert(dto, user.employeeProfileId);
  }

  @Patch(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto, @GetUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Get('employee/:employeeId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.EMPLOYEE)
  findByEmployee(@Param('employeeId') employeeId: string, @Query('period') period?: string) {
    return this.service.findByEmployee(employeeId, period);
  }

  @Post('self')
  @Roles(RoleCode.EMPLOYEE)
  submitSelf(@Body() dto: any, @GetUser() user: any) {
    return this.service.submitSelf(user.employeeProfileId, dto, user);
  }

  @Delete('self/:id')
  @Roles(RoleCode.EMPLOYEE)
  removeSelf(@Param('id') id: string, @GetUser() user: any) {
    return this.service.removeSelf(id, user);
  }

  @Get('supervisor')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  listBySupervisor(@GetUser() user: any, @Query('period') period?: string) {
    return this.service.listBySupervisor(user.sub, period);
  }

  @Delete(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
