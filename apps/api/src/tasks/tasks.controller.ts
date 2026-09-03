import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto, UpdateTaskProgressDto, RequestRevisionDto, TaskQueryDto, UpdateTaskDto } from './dto/task.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.module';
import { StorageService } from '../common/services/storage.service';
import * as fs from 'fs';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private service: TasksService,
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.SALES_CONSULTANT)
  create(@Body() dto: CreateTaskDto, @GetUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: TaskQueryDto, @GetUser() user: JwtPayload) {
    return this.service.findAll(query, user);
  }

  @Get('my/stats')
  getMyStats(@GetUser() user: JwtPayload) {
    return this.service.getMyStats(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const task = await this.service.findOne(id, user);
    return { data: task };
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @GetUser() user: JwtPayload) {
    return this.service.updateStatus(id, dto, user);
  }

  @Patch(':id/progress')
  updateProgress(@Param('id') id: string, @Body() dto: UpdateTaskProgressDto, @GetUser() user: JwtPayload) {
    return this.service.updateProgress(id, dto.progress, user);
  }

  @Patch(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @GetUser() user: JwtPayload) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO)
  remove(@Param('id') id: string, @GetUser() user: JwtPayload) {
    return this.service.softDelete(id, user);
  }

  @Post(':id/revision')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  requestRevision(@Param('id') id: string, @Body() dto: RequestRevisionDto, @GetUser() user: JwtPayload) {
    return this.service.requestRevision(id, dto, user);
  }

  @Post(':id/comment')
  addComment(@Param('id') id: string, @Body('message') message: string, @GetUser() user: JwtPayload) {
    return this.service.addComment(id, message, user);
  }

  @Post(':id/attachment')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
        cb(null, unique + extname(file.originalname));
      },
    }),
    limits: { fileSize: 20*1024*1024 },
  }))
  async uploadAttachment(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @GetUser() user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    // versioning
    const last = await this.prisma.taskAttachment.findFirst({ where: { taskAssignmentId: id }, orderBy: { version: 'desc' } });
    const version = (last?.version || 0) + 1;
    const storageUrl = await this.storage.uploadFile(file.path, `tasks/${file.filename}`);
    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskAssignmentId: id,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: file.path,
        storageUrl,
        version,
        uploadedById: user.sub,
      },
    });
    return attachment;
  }

  @Get(':id/attachments')
  async getAttachments(@Param('id') id: string, @GetUser() user: JwtPayload) {
    await this.service.findOne(id, user);
    return this.prisma.taskAttachment.findMany({ where: { taskAssignmentId: id }, orderBy: { version: 'desc' } });
  }

  @Post(':id/dependencies')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async addDependency(@Param('id') id: string, @Body('dependsOn') dependsOn: string, @GetUser() user: JwtPayload) {
    return this.service.addDependency(id, dependsOn, user);
  }

  @Delete(':id/dependencies/:dependsOn')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async removeDependency(@Param('id') id: string, @Param('dependsOn') dependsOn: string, @GetUser() user: JwtPayload) {
    return this.service.removeDependency(id, dependsOn, user);
  }
}
