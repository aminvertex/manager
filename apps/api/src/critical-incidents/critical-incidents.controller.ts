import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { CriticalIncidentsService } from './critical-incidents.service';
import { CreateCriticalIncidentDto, UpdateCriticalIncidentDto } from './dto/critical-incident.dto';

@ApiTags('critical-incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('critical-incidents')
export class CriticalIncidentsController {
  constructor(private service: CriticalIncidentsService) {}

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  create(@Body() dto: CreateCriticalIncidentDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Patch(':id/resolve')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  resolve(@Param('id') id: string, @Body() dto: UpdateCriticalIncidentDto, @GetUser() user: JwtPayload) {
    return this.service.resolve(id, dto, user);
  }
}
