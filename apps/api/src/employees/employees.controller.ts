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
import * as fs from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleCode } from '@amatis/types';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  ResetPasswordDto,
} from './dto/employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'لیست کارمندان' })
  async findAll(@Query() query: EmployeeQueryDto, @GetUser() user: JwtPayload) {
    const result = await this.employeesService.findAll(query, user);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات کارمند' })
  async findOne(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.employeesService.findOne(id, user);
    return { success: true, data: result };
  }

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'ایجاد کارمند جدید' })
  async create(@Body() dto: CreateEmployeeDto, @GetUser() user: JwtPayload) {
    const result = await this.employeesService.create(dto, user);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کارمند' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.employeesService.update(id, dto, user);
    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'حذف کارمند' })
  async remove(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.employeesService.softDelete(id, user);
    return { success: true, data: result };
  }

  @Post(':id/reset-password')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'بازنشانی رمز عبور' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.employeesService.resetPassword(id, dto, user);
    return { success: true, data: result };
  }

  @Patch(':id/toggle-active')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'فعال/غیرفعال کردن کارمند' })
  async toggleActive(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const result = await this.employeesService.toggleActive(id, user);
    return { success: true, data: result };
  }

  @Patch(':id/role')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  @ApiOperation({ summary: 'تغییر نقش کارمند' })
  async changeRole(
    @Param('id') id: string,
    @Body('roleCode') roleCode: string,
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.employeesService.changeRole(id, roleCode, user);
    return { success: true, data: result };
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = './uploads/avatars';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  @ApiOperation({ summary: 'آپلود عکس پروفایل' })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: JwtPayload,
  ) {
    const result = await this.employeesService.uploadAvatar(id, file, user);
    return { success: true, data: result };
  }
}
