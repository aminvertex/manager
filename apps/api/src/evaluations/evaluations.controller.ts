import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/evaluation.dto';

@ApiTags('evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private service: EvaluationsService) {}

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  create(@Body() dto: CreateEvaluationDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
