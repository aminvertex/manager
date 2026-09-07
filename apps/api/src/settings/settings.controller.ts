import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleCode } from '@amatis/types';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت تنظیمات' })
  async findAll(@Query('category') category?: string) {
    const result = await this.settingsService.findAll(category);
    return { success: true, data: result };
  }

  @Get('categories')
  @ApiOperation({ summary: 'دسته‌بندی‌های تسک' })
  async getCategories() {
    const result = await this.settingsService.getCategories();
    return { success: true, data: result };
  }

  @Get('priorities')
  @ApiOperation({ summary: 'اولویت‌ها' })
  async getPriorities() {
    const result = await this.settingsService.getPriorities();
    return { success: true, data: result };
  }

  @Get('kpi-weights')
  @ApiOperation({ summary: 'وزن KPI' })
  async getKpiWeights() {
    const result = await this.settingsService.getKpiWeights();
    return { success: true, data: result };
  }

  @Get('performance-classifications')
  @ApiOperation({ summary: 'کلاس‌های عملکرد' })
  async getPerformanceClassifications() {
    const result = await this.settingsService.getPerformanceClassifications();
    return { success: true, data: result };
  }

  @Get('id-patterns')
  @ApiOperation({ summary: 'الگوی شناسه‌ها' })
  async getIdPatterns() {
    const result = await this.settingsService.getIdPatterns();
    return { success: true, data: result };
  }

@Put('id-patterns')
@Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'ذخیره الگوی شناسه‌ها' })
  async saveIdPatterns(@Body() body: { employeePrefix?: string; projectPrefix?: string; applyToExisting?: boolean }) {
    const result = await this.settingsService.saveIdPatterns(body);
    return { success: true, data: result };
  }

@Post('id-patterns/regenerate')
@Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'اعمال الگوی جدید روی شناسه‌های قبلی' })
  async regenerateIds() {
    const result = await this.settingsService.regenerateExistingIds();
    return { success: true, data: result };
  }

  @Get(':key')
  @ApiOperation({ summary: 'دریافت تنظیم با کلید' })
  async findByKey(@Param('key') key: string) {
    const result = await this.settingsService.findByKey(key);
    return { success: true, data: result };
  }

  @Put(':key')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  @ApiOperation({ summary: 'بروزرسانی تنظیم' })
  async upsert(
    @Param('key') key: string,
    @Body() body: { value: unknown; category: string; label?: string },
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.settingsService.upsert(
      key,
      body.value,
      body.category,
      body.label,
      user,
    );
    return { success: true, data: result };
  }
}
