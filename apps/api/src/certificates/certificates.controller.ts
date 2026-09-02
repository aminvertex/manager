import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private service: CertificatesService) {}

  @Get('templates')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  async listTemplates() {
    return { success: true, data: await this.service.listTemplates() };
  }

  @Post('templates')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  async createTemplate(@Body() dto: any, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.createTemplate(dto, user) };
  }

  @Patch('templates/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  async updateTemplate(@Param('id') id: string, @Body() dto: any, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.updateTemplate(id, dto, user) };
  }

  @Delete('templates/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  async deleteTemplate(@Param('id') id: string, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.deleteTemplate(id, user) };
  }

  @Get('render/:trainingId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.SALES_CONSULTANT)
  async render(@Param('trainingId') trainingId: string, @Query('templateId') templateId?: string) {
    return { success: true, data: await this.service.renderCertificate(trainingId, templateId || null) };
  }
}