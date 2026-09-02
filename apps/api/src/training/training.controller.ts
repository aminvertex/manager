import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { TrainingService } from './training.service';
import { CreateTrainingDto } from './dto/training.dto';

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training')
export class TrainingController {
  constructor(private service: TrainingService) {}

  @Post()
  create(@Body() dto: CreateTrainingDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: any, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @GetUser() user: JwtPayload) {
    return this.service.update(id, dto, user);
  }
}
