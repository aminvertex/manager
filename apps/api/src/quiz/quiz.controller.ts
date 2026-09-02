import { Controller, Get, Post, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { QuizService } from './quiz.service';
import * as PDFDocument from 'pdfkit';

@ApiTags('quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quiz')
export class QuizController {
  constructor(private service: QuizService) {}

  @Post('create')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async create(@Body() dto: any, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.createQuiz(dto, user) };
  }

  @Get('training/:trainingId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  async getByTraining(@Param('trainingId') trainingId: string, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.getQuiz(trainingId, user) };
  }

  @Post('training/:trainingId/submit')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  async submit(@Param('trainingId') trainingId: string, @Body('answers') answers: Record<string, number>, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.submitAttempt(trainingId, answers, user) };
  }

  @Get('training/:trainingId/certificate')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  async certificate(@Param('trainingId') trainingId: string, @GetUser() user: JwtPayload, @Res() res: Response) {
    const t = await this.service.getCertificate(trainingId, user);
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificate-${t.id}.pdf`);
      res.send(buffer);
    });

    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor('#22c55e').lineWidth(4).stroke();
    doc.fontSize(28).fillColor('#22c55e').text('گواهینامه تکمیل آموزش', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#333').text(`این گواهینامه به ${t.employee.firstName} ${t.employee.lastName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`به‌خاطر تکمیل موفق دوره «${t.title}»`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`با نمره ${t.examScore} از ۱۰۰`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#888').text(`کد پرسنلی: ${t.employee.employeeCode} — تاریخ: ${new Date().toLocaleDateString('fa-IR')}`, { align: 'center' });
    doc.end();
  }

  @Get('training/:trainingId/attempts')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async attempts(@Param('trainingId') trainingId: string, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.listAttempts(trainingId, user) };
  }

  @Post('training/:trainingId/retake-request')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.SALES_CONSULTANT)
  async requestRetake(@Param('trainingId') trainingId: string, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.requestRetake(trainingId, user) };
  }

  @Post('training/:trainingId/retake-approve')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER)
  async approveRetake(@Param('trainingId') trainingId: string, @GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.approveRetake(trainingId, user) };
  }
}
