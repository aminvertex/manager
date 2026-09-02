import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { SettingsModule } from './settings/settings.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { HealthModule } from './health/health.module';
import { TaskTemplatesModule } from './task-templates/task-templates.module';
import { TasksModule } from './tasks/tasks.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { QualityControlModule } from './quality-control/quality-control.module';
import { PsychometricModule } from './psychometric/psychometric.module';
import { TrainingModule } from './training/training.module';
import { KpiModule } from './kpi/kpi.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MonthlyReviewsModule } from './monthly-reviews/monthly-reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CriticalIncidentsModule } from './critical-incidents/critical-incidents.module';
import { PerformanceEvaluationsModule } from './performance-evaluations/performance-evaluations.module';
import { ChatModule } from './chat/chat.module';
import { CommonModule } from './common/common.module';
import { ExportsModule } from './exports/exports.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QuizModule } from './quiz/quiz.module';
import { CertificatesModule } from './certificates/certificates.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(
          process.env.NODE_ENV === 'production'
            ? process.env.RATE_LIMIT_LIMIT || '100'
            : process.env.RATE_LIMIT_LIMIT_DEV || '10000',
          10,
        ),
      },
    ]),
    PrismaModule,
    CommonModule,
    AuthModule,
    EmployeesModule,
    ProjectsModule,
    SettingsModule,
    AuditLogsModule,
    HealthModule,
    TaskTemplatesModule,
    TasksModule,
    ChecklistsModule,
    EvaluationsModule,
    QualityControlModule,
    PsychometricModule,
    TrainingModule,
    KpiModule,
    DashboardModule,
    MonthlyReviewsModule,
    NotificationsModule,
    CriticalIncidentsModule,
    PerformanceEvaluationsModule,
    ChatModule,
    ExportsModule,
    SchedulerModule,
    QuizModule,
    CertificatesModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
