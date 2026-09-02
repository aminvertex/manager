import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { ExportsService } from './exports.service';
import { PrismaService } from '../prisma/prisma.module';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exports')
export class ExportsController {
  constructor(private service: ExportsService, private prisma: PrismaService) {}

  @Get('projects')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async projectsExcel(@GetUser() user: JwtPayload, @Res() res: Response) {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        members: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        taskAssignments: { where: { deletedAt: null }, select: { status: true, deadline: true } },
      },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMATIS';

    for (const project of projects) {
      const safeName = (project.name || 'پروژه').replace(/[*?:\\/[\]"]/g, '-').slice(0, 30);
      const ws = wb.addWorksheet(safeName || 'پروژه');
      const tasks = project.taskAssignments || [];
      const completed = tasks.filter((t) => t.status === 'APPROVED').length;
      const delayed = tasks.filter((t) => t.status === 'DELAYED').length;

      ws.addRow([`پروژه: ${project.name}`, `کد: ${project.code}`]).font = { bold: true };
      ws.addRow([`کل تسک‌ها: ${tasks.length}`, `تکمیل: ${completed}`, `تأخیر: ${delayed}`]);
      ws.addRow([]);
      ws.columns = [
        { header: 'نام عضو', key: 'name', width: 20 },
        { header: 'نام خانوادگی', key: 'lastName', width: 20 },
      ];
      project.members.forEach((m) => ws.addRow({ name: m.employee.firstName, lastName: m.employee.lastName }));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=all-projects.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('monthly/:period')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async monthlyExcel(@Param('period') period: string, @GetUser() user: JwtPayload, @Res() res: Response) {
    const report = await this.service.monthlyReport(period, user);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMATIS';
    const ws = wb.addWorksheet(`گزارش ${period}`);
    ws.columns = [
      { header: 'کد', key: 'employeeCode', width: 12 },
      { header: 'نام', key: 'name', width: 20 },
      { header: 'سمت', key: 'position', width: 15 },
      { header: 'نقش', key: 'role', width: 12 },
      { header: 'تسک', key: 'totalTasks', width: 8 },
      { header: 'تکمیل', key: 'completed', width: 8 },
      { header: 'تأخیر', key: 'delayed', width: 8 },
      { header: 'اصلاحات', key: 'revisionCount', width: 8 },
      { header: '٪ تکمیل', key: 'completionRate', width: 8 },
      { header: 'کیفیت', key: 'avgQuality', width: 8 },
      { header: 'KPI', key: 'kpi', width: 8 },
    ];

    report.rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: 'center' };
    ws.eachRow((row) => { row.alignment = { horizontal: 'center', vertical: 'middle' }; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-report-${period}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('project/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR)
  async projectExcel(@Param('id') id: string, @GetUser() user: JwtPayload, @Res() res: Response) {
    const report = await this.service.projectReport(id, user);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMATIS';
    const safeName = (report.project.name || 'پروژه').replace(/[*?:\\/[\]\"]/g, '-').slice(0, 30);
    const ws = wb.addWorksheet(safeName || 'پروژه');

    ws.addRow([`پروژه: ${report.project.name}`, `کد: ${report.project.code}`, `پیشرفت: ${report.progress}٪`, `کل تسک‌ها: ${report.totalTasks}`]).font = { bold: true };
    ws.addRow([]);
    ws.columns = [
      { header: 'نام', key: 'name', width: 20 },
      { header: 'کد', key: 'employeeCode', width: 12 },
      { header: 'تسک', key: 'tasks', width: 8 },
      { header: 'تکمیل', key: 'completed', width: 8 },
      { header: 'در جریان', key: 'inProgress', width: 8 },
      { header: 'تأخیر', key: 'delayed', width: 8 },
    ];
    report.members.forEach((m) => ws.addRow(m));
    ws.getRow(3).font = { bold: true };
    ws.eachRow((row) => { row.alignment = { horizontal: 'center', vertical: 'middle' }; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=project-${report.project.code}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('team')
  @Roles(RoleCode.SUPERVISOR)
  async teamExcel(@GetUser() user: JwtPayload, @Res() res: Response) {
    const report = await this.service.supervisorTeamReport(user);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMATIS';
    const ws = wb.addWorksheet('تیم من');

    ws.columns = [
      { header: 'نام', key: 'name', width: 20 },
      { header: 'کد', key: 'employeeCode', width: 12 },
      { header: 'سمت', key: 'position', width: 15 },
      { header: 'تسک', key: 'totalTasks', width: 8 },
      { header: 'تکمیل', key: 'completed', width: 8 },
      { header: 'تأخیر', key: 'delayed', width: 8 },
      { header: 'اصلاحات', key: 'revisionCount', width: 8 },
      { header: '٪ تکمیل', key: 'completionRate', width: 8 },
    ];
    report.members.forEach((m) => ws.addRow(m));
    ws.getRow(1).font = { bold: true };
    ws.eachRow((row) => { row.alignment = { horizontal: 'center', vertical: 'middle' }; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=team-report.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('monthly/:period/pdf')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async monthlyPdf(@Param('period') period: string, @GetUser() user: JwtPayload, @Res() res: Response) {
    const report = await this.service.monthlyReport(period, user);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly-${period}.pdf`);
      res.send(buffer);
    });

    doc.fontSize(16).text('گزارش عملکرد ماهانه', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`دوره: ${period}`, { align: 'center' });
    doc.moveDown();

    const headers = ['#', 'نام', 'سمت', 'نقش', 'تسک', 'تکمیل', 'تأخیر', '٪', 'KPI'];
    const colWidths = [25, 120, 100, 70, 40, 45, 45, 40, 50];
    const tableTop = 130;
    let y = tableTop;

    const drawRow = (cells: string[], isHeader: boolean, rowY: number) => {
      let x = 40;
      doc.fontSize(8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((cell, i) => {
        doc.text(String(cell), x + 4, rowY + 2, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
      if (isHeader) {
        doc.moveTo(40, rowY).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), rowY).stroke();
      }
      doc.moveTo(40, rowY + 15).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), rowY + 15).stroke();
    };

    drawRow(headers, true, y);
    y += 15;
    report.rows.forEach((r, i) => {
      if (y > 480) {
        doc.addPage();
        y = 40;
      }
      drawRow([String(i + 1), r.name, r.position || '', r.role || '', String(r.totalTasks), String(r.completed), String(r.delayed), String(r.completionRate), r.kpi != null ? String(r.kpi) : '—'], false, y);
      y += 15;
    });

    doc.end();
  }
}