import { KPIWeights, PerformanceClassification, RoleCode } from '@amatis/types';

export const DEFAULT_KPI_WEIGHTS: KPIWeights = {
  onTimeDelivery: 20,
  scientificQuality: 20,
  accuracy: 15,
  documentation: 10,
  productivity: 10,
  processCompliance: 10,
  learning: 5,
  teamwork: 5,
  responsibility: 5,
};

export const DEFAULT_PERFORMANCE_CLASSIFICATIONS: PerformanceClassification[] = [
  { minScore: 90, maxScore: 100, label: 'ممتاز', color: 'green' },
  { minScore: 80, maxScore: 89, label: 'بسیار خوب', color: 'green' },
  { minScore: 70, maxScore: 79, label: 'قابل قبول', color: 'yellow' },
  { minScore: 60, maxScore: 69, label: 'نیازمند بهبود', color: 'yellow' },
  { minScore: 0, maxScore: 59, label: 'نیازمند مداخله مدیریتی', color: 'red' },
];

export const TASK_CATEGORIES = [
  'ارزیابی و روان‌سنجی',
  'تحلیل و تفسیر',
  'گزارش‌نویسی',
  'فیدبک به مراجع',
  'طراحی نقشه راه',
  'پیگیری مراجع',
  'کنترل پرونده',
  'مستندسازی',
  'آموزش',
  'تحقیق و توسعه',
  'تولید محتوای تخصصی',
  'امور سازمانی',
] as const;

export const INITIAL_PROJECTS = [
  { name: 'روانشناسی فردی', code: 'IND-PSY' },
  { name: 'اکسیر دل', code: 'EKSEIR-DEL' },
  { name: 'بامبو', code: 'BAMBOO' },
  { name: 'ارزیابی و روان‌سنجی', code: 'ASSESS-PSY' },
  { name: 'آموزش', code: 'TRAINING' },
  { name: 'تحقیق و توسعه', code: 'RND' },
  { name: 'سایر پروژه‌ها', code: 'OTHER' },
] as const;

export const DAILY_CHECKLIST_ITEMS = [
  'برنامه روزانه بررسی شد',
  'اولویت‌ها مشخص شد',
  'Deadlineها بررسی شد',
  'پرونده‌های روز بررسی شد',
  'Taskهای عقب‌افتاده بررسی شد',
  'محرمانگی رعایت شد',
  'اطلاعات مراجع کامل بررسی شد',
  'پروتکل ارزیابی رعایت شد',
  'ابزار مناسب انتخاب شد',
  'تحلیل بر اساس داده انجام شد',
  'نتیجه‌گیری شتاب‌زده انجام نشد',
  'مستندات تکمیل شد',
  'ابهامات به سرپرست ارجاع شد',
  'خروجی‌های روز تحویل شد',
  'Taskهای ناقص مشخص شد',
  'دلیل تأخیر ثبت شد',
  'فایل‌ها در محل مناسب ذخیره شد',
  'گزارش روزانه تکمیل شد',
  'برنامه فردا مشخص شد',
] as const;

export const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.SUPER_ADMIN]: 'مدیر سیستم',
  [RoleCode.CEO]: 'مدیرعامل',
  [RoleCode.EXPERT_L1]: 'کارشناس سطح یک',
  [RoleCode.EXPERT_L2]: 'کارشناس سطح دو',
  [RoleCode.EXPERT_L3]: 'کارشناس سطح سه',
  [RoleCode.TECH_COMMITTEE_MEMBER]: 'عضو کمیته فنی',
  [RoleCode.TECH_COMMITTEE_MANAGER]: 'مدیر کمیته فنی',
  [RoleCode.SALES_CONSULTANT]: 'مشاور فروش',
  [RoleCode.SUPERVISOR]: 'سرپرست',
  [RoleCode.EMPLOYEE]: 'کارشناس',
};

export const MOBILE_REGEX = /^09\d{9}$/;

export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

export function generateEmployeeCode(sequence: number): string {
  return `EMP-${String(sequence).padStart(4, '0')}`;
}
