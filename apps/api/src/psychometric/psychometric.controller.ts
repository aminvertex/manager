import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { PsychometricService } from './psychometric.service';
import { CreatePsychometricDto, UpdatePsychometricStatusDto } from './dto/psychometric.dto';

@ApiTags('psychometric')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('psychometric')
export class PsychometricController {
  constructor(private service: PsychometricService) {}

  @Post()
  create(@Body() dto: CreatePsychometricDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePsychometricStatusDto, @GetUser() user: JwtPayload) {
    return this.service.updateStatus(id, dto, user);
  }
}
