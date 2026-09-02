import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { QualityControlService } from './quality-control.service';
import { CreateQualityControlDto } from './dto/quality-control.dto';

@ApiTags('quality-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quality-control')
export class QualityControlController {
  constructor(private service: QualityControlService) {}

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  create(@Body() dto: CreateQualityControlDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }
}
