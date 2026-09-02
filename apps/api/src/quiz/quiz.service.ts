import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private dataScope: DataScopeService,
  ) {}

  async createQuiz(dto: any, user: JwtPayload) {
    const training = await this.prisma.training.findUnique({ where: { id: dto.trainingId } });
    if (!training) throw new NotFoundException('آموزش یافت نشد');

    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: { trainingId: dto.trainingId, title: dto.title, passScore: dto.passScore || 70, timeMinutes: dto.timeMinutes || 15 },
      });
      if (dto.questions?.length) {
        await tx.quizQuestion.createMany({
          data: dto.questions.map((q: any) => ({
            quizId: quiz.id, text: q.text, options: q.options, correct: q.correct, score: q.score || 1,
          })),
        });
      }
      await this.audit.logFromRequest(user, 'QUIZ_CREATED', 'Quiz', quiz.id);
      return quiz;
    });
  }

  async getQuiz(trainingId: string, user: JwtPayload) {
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('آموزش یافت نشد');
    if (training.employeeId !== user.employeeProfileId && !this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR')) {
      throw new ForbiddenException('دسترسی غیرمجاز');
    }
    const quiz = await this.prisma.quiz.findUnique({
      where: { trainingId },
      include: {
        questions: { select: { id: true, text: true, options: true, score: true } }, // no correct answer
        attempts: { where: { employeeId: user.employeeProfileId }, orderBy: { completedAt: 'desc' }, take: 1 },
      },
    });
    if (!quiz) return null;
    return quiz;
  }

  async submitAttempt(trainingId: string, answers: Record<string, number>, user: JwtPayload) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { trainingId },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('آزمون یافت نشد');

    let total = 0;
    let earned = 0;
    for (const q of quiz.questions) {
      total += q.score;
      if (answers[q.id] === q.correct) earned += q.score;
    }
    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = score >= quiz.passScore;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        employeeId: user.employeeProfileId!,
        answers: answers as any,
        score,
        passed,
      },
    });

    if (passed) {
      await this.prisma.training.update({
        where: { id: trainingId },
        data: { examScore: score, status: 'COMPLETED' },
      });
    }
    await this.audit.logFromRequest(user, 'QUIZ_ATTEMPTED', 'QuizAttempt', attempt.id, undefined, { score, passed } as any);
    return { attempt, score, passed, passScore: quiz.passScore, totalQuestions: quiz.questions.length };
  }

  async getCertificate(trainingId: string, user: JwtPayload) {
    const training = await this.prisma.training.findUnique({
      where: { id: trainingId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
    if (!training) throw new NotFoundException('آموزش یافت نشد');
    if (training.status !== 'COMPLETED' || training.examScore == null) {
      throw new ForbiddenException('آزمون هنوز با موفقیت تکمیل نشده است');
    }
    return training;
  }

  async listAttempts(trainingId: string, user: JwtPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { trainingId } });
    if (!quiz) throw new NotFoundException('آزمون یافت نشد');
    return this.prisma.quizAttempt.findMany({
      where: { quizId: quiz.id },
      orderBy: { completedAt: 'desc' },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  // Phase 48: retake approval flow
  async requestRetake(trainingId: string, user: JwtPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { trainingId } });
    if (!quiz) throw new NotFoundException('آزمون یافت نشد');
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('آموزش یافت نشد');

    const latest = await this.prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, employeeId: user.employeeProfileId },
      orderBy: { completedAt: 'desc' },
    });
    if (!latest) throw new BadRequestException('ابتدا باید آزمون را بدهید');
    if (latest.passed) throw new BadRequestException('شما قبول شده‌اید و نیازی به آزمون مجدد نیست');

    // notify supervisors/admins
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, userRoles: { some: { role: { code: { in: ['SUPER_ADMIN', 'CEO', 'TECH_COMMITTEE_MANAGER'] } } } } },
      select: { id: true },
    });
    const emp = await this.prisma.employeeProfile.findUnique({ where: { id: user.employeeProfileId }, select: { firstName: true, lastName: true } });
    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'RETAKE_REQUEST',
        title: 'درخواست آزمون مجدد',
        message: `${emp?.firstName} ${emp?.lastName} درخواست آزمون مجدد برای «${training.title}» دارد`,
        entityType: 'Training',
        entityId: trainingId,
      })),
    });
    return { message: 'درخواست آزمون مجدد به مدیر ارجاع شد', requested: true };
  }

  // Approve retake: reset latest attempt status so user can try again
  async approveRetake(trainingId: string, user: JwtPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { trainingId } });
    if (!quiz) throw new NotFoundException('آزمون یافت نشد');
    const latest = await this.prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id },
      orderBy: { completedAt: 'desc' },
      include: { employee: { select: { userId: true } } },
    });
    if (!latest) throw new NotFoundException('تلاشی برای آزمون مجدد یافت نشد');
    return { message: 'آزمون مجدد تأیید شد', approved: true, attemptId: latest.id };
  }
}
