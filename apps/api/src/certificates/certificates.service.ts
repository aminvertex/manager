import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { JwtPayload } from '../common/decorators/get-user.decorator';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listTemplates() {
    return this.prisma.certificateTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createTemplate(dto: { name: string; body: string; variables?: string[]; isDefault?: boolean }, user: JwtPayload) {
    const template = await this.prisma.certificateTemplate.create({
      data: {
        name: dto.name,
        body: dto.body,
        variables: dto.variables || [],
        isDefault: dto.isDefault || false,
      },
    });
    await this.audit.logFromRequest(user, 'CERT_TEMPLATE_CREATED', 'CertificateTemplate', template.id);
    return template;
  }

  async updateTemplate(id: string, dto: { name?: string; body?: string; variables?: string[]; isDefault?: boolean }, user: JwtPayload) {
    const existing = await this.prisma.certificateTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('قالب یافت نشد');
    const template = await this.prisma.certificateTemplate.update({ where: { id }, data: dto as any });
    await this.audit.logFromRequest(user, 'CERT_TEMPLATE_UPDATED', 'CertificateTemplate', id);
    return template;
  }

  async deleteTemplate(id: string, user: JwtPayload) {
    await this.prisma.certificateTemplate.delete({ where: { id } });
    await this.audit.logFromRequest(user, 'CERT_TEMPLATE_DELETED', 'CertificateTemplate', id);
    return { message: 'قالب حذف شد' };
  }

  // Render certificate with variables for a training
  async renderCertificate(trainingId: string, templateId: string | null) {
    const training = await this.prisma.training.findUnique({
      where: { id: trainingId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
    if (!training) throw new NotFoundException('آموزش یافت نشد');
    if (training.status !== 'COMPLETED' || training.examScore == null) {
      throw new ForbiddenException('آزمون هنوز با موفقیت تکمیل نشده است');
    }

    const template = templateId
      ? await this.prisma.certificateTemplate.findUnique({ where: { id: templateId } })
      : await this.prisma.certificateTemplate.findFirst({ where: { isDefault: true } });

    const variables: Record<string, string> = {
      employee_name: `${training.employee.firstName} ${training.employee.lastName}`,
      course_name: training.title,
      score: String(training.examScore),
      date: new Date().toLocaleDateString('fa-IR'),
      certificate_id: `CERT-${training.id.slice(-8).toUpperCase()}`,
    };

    const body = template ? template.body : 'گواهینامه تکمیل دوره «{{course_name}}» برای {{employee_name}} با نمره {{score}}';
    const rendered = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m: string, key: string) => variables[key] ?? m);

    return {
      rendered,
      variables,
      templateName: template?.name || 'پیش‌فرض',
      certificateId: variables.certificate_id,
    };
  }
}
