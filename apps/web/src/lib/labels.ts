import { RoleCode } from '@amatis/types';

export const TASK_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'اختصاص داده شده',
  NOT_STARTED: 'شروع نشده',
  IN_PROGRESS: 'در حال انجام',
  SUBMITTED: 'ارسال شده',
  UNDER_REVIEW: 'در حال بررسی',
  NEED_REVISION: 'نیازمند اصلاح',
  RESUBMITTED: 'ارسال مجدد',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
  DELAYED: 'عقب افتاده',
};

export const TASK_STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-success/15 text-success border-success/30',
  REJECTED: 'bg-destructive/15 text-destructive border-destructive/30',
  NEED_REVISION: 'bg-warning/15 text-warning border-warning/30',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  SUBMITTED: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  UNDER_REVIEW: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  DELAYED: 'bg-destructive/15 text-destructive border-destructive/30',
  CANCELLED: 'bg-muted text-muted-foreground border-muted-foreground/20',
  ASSIGNED: 'bg-muted text-muted-foreground border-muted-foreground/20',
  NOT_STARTED: 'bg-muted text-muted-foreground border-muted-foreground/20',
  RESUBMITTED: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'کم',
  MEDIUM: 'متوسط',
  HIGH: 'زیاد',
  URGENT: 'فوری',
};

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-destructive',
};

export const ROLE_LABELS: Record<string, string> = {
  [RoleCode.SUPER_ADMIN]: 'مدیر سیستم',
  [RoleCode.CEO]: 'مدیرعامل',
  [RoleCode.SUPERVISOR]: 'سرپرست',
  [RoleCode.EMPLOYEE]: 'کارشناس',
};

export const EVALUATION_CRITERIA_LABELS: Record<string, string> = {
  scientific_accuracy: 'دقت علمی',
  analysis_correctness: 'درستی تحلیل',
  interpretation_quality: 'کیفیت تفسیر',
  personalization: 'شخصی‌سازی',
  protocol_compliance: 'پیروی پروتکل',
  writing_quality: 'کیفیت نگارش',
  documentation: 'مستندسازی',
  timeliness: 'تسلیم به‌موقع',
  independence: 'استقلال در انجام کار',
  professional_ethics: 'اخلاق حرفه‌ای',
};

export const SKILL_LEVEL_LABELS: Record<string, string> = {
  JUNIOR: 'مبتدی',
  MID: 'متوسط',
  SENIOR: 'ارشد',
  EXPERT: 'خبره',
};

export const COLLAB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'تمام‌وقت',
  PART_TIME: 'پاره‌وقت',
  CONTRACT: 'قراردادی',
  FREELANCE: 'آزاد',
};
