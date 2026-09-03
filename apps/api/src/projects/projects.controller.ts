import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { RoleCode } from '@amatis/types';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
} from './dto/project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { StorageService } from '../common/services/storage.service';
import * as fs from 'fs';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'لیست پروژه‌ها' })
  async findAll(@Query() query: ProjectQueryDto, @GetUser() user: JwtPayload) {
    const result = await this.projectsService.findAll(query, user);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات پروژه' })
  async findOne(@Param('id') id: string) {
    const result = await this.projectsService.findOne(id);
    return { success: true, data: result };
  }

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'ایجاد پروژه' })
  async create(@Body() dto: CreateProjectDto, @GetUser() user: JwtPayload) {
    const result = await this.projectsService.create(dto, user);
    return { success: true, data: result };
  }

  @Patch(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'ویرایش پروژه' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.projectsService.update(id, dto, user);
    return { success: true, data: result };
  }

  @Patch(':id/toggle-active')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'فعال/قفل پروژه' })
  async toggleActive(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.projectsService.toggleActive(id, user);
    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'حذف پروژه' })
  async remove(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.projectsService.softDelete(id, user);
    return { success: true, data: result };
  }

  @Post(':id/members')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  @ApiOperation({ summary: 'اضافه کردن عضو به پروژه' })
  async addMember(@Param('id') id: string, @Body('employeeId') employeeId: string, @GetUser() user: JwtPayload) {
    return this.projectsService.addMember(id, employeeId, user);
  }

  @Delete(':id/members/:employeeId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  @ApiOperation({ summary: 'حذف عضو از پروژه' })
  async removeMember(@Param('id') id: string, @Param('employeeId') employeeId: string, @GetUser() user: JwtPayload) {
    return this.projectsService.removeMember(id, employeeId, user);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'گزارش کامل پروژه' })
  async getReport(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.projectsService.getReport(id, user);
    return { success: true, data: result };
  }

  @Post(':id/logo')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = './uploads/logos';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  @ApiOperation({ summary: 'آپلود لوگوی پروژه' })
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @GetUser() user: JwtPayload) {
    const logoUrl = await this.storage.uploadFile(file.path, `logos/${file.filename}`);
    const result = await this.projectsService.updateLogo(id, logoUrl, user);
    return { success: true, data: result };
  }
}
