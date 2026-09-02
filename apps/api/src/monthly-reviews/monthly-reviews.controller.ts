import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '@amatis/types';
import { MonthlyReviewsService } from './monthly-reviews.service';

@ApiTags('monthly-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monthly-reviews')
export class MonthlyReviewsController {
  constructor(private service: MonthlyReviewsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post('generate')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  generate(@Query('period') period: string, @Query('employeeId') employeeId?: string) {
    if (employeeId) return this.service.generateForEmployee(employeeId, period);
    return this.service.generateAll(period);
  }
}
