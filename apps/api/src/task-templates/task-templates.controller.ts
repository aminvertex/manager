import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { TaskTemplatesService } from './task-templates.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, TaskTemplateQueryDto } from './dto/task-template.dto';

@ApiTags('task-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-templates')
export class TaskTemplatesController {
  constructor(private service: TaskTemplatesService) {}

  @Get()
  findAll(@Query() query: TaskTemplateQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  create(@Body() dto: CreateTaskTemplateDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto, @GetUser() user: JwtPayload) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.SUPERVISOR)
  delete(@Param('id') id: string, @GetUser() user: JwtPayload) {
    return this.service.softDelete(id, user);
  }
}
