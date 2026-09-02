'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Lang = 'fa' | 'en';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const FA: Record<string, string> = {
  'app.title': 'آماتیس',
  'app.subtitle': 'راشا آماتیس',
  'dashboard': 'داشبورد',
  'profile': 'پروفایل',
  'notifications': 'اعلان‌ها',
  'chat': 'پیام‌ها',
  'tasks': 'تسک‌ها',
  'my_tasks': 'تسک‌های من',
  'team_tasks': 'تسک‌های تیم',
  'calendar': 'تقویم کاری',
  'daily_checklist': 'چک‌لیست روزانه',
  'weekly_checklist': 'چک‌لیست هفتگی',
  'my_performance': 'عملکرد من',
  'my_training': 'آموزش‌های من',
  'team': 'تیم من',
  'reports': 'گزارش‌ها',
  'work_report': 'گزارش کاری',
  'evaluations': 'ارزیابی‌ها',
  'assign_training': 'تعیین آموزش',
  'task_templates': 'قالب تسک‌ها',
  'projects': 'پروژه‌ها',
  'employees': 'کارمندان',
  'kpi': 'KPI و فرمول‌ها',
  'settings': 'تنظیمات',
  'audit': 'گزارش‌های حسابرسی',
  'logout': 'خروج',
  'search': 'جستجو',
  'save': 'ذخیره',
  'cancel': 'انصراف',
  'delete': 'حذف',
  'edit': 'ویرایش',
  'create': 'ایجاد',
  'loading': 'در حال بارگذاری...',
  'no_data': 'داده‌ای یافت نشد',
  'error': 'خطا',
  'success': 'موفق',
  'confirm_delete': 'آیا مطمئن هستید؟',
  'new_employee': 'کارمند جدید',
  'new_project': 'پروژه جدید',
  'new_task': 'تسک جدید',
  'export': 'خروجی',
  'export_excel': 'خروجی Excel',
  'export_pdf': 'خروجی PDF',
  'total': 'کل',
  'completed': 'تکمیل‌شده',
  'in_progress': 'در حال انجام',
  'delayed': 'عقب‌افتاده',
  'need_revision': 'نیازمند اصلاح',
  'on_time': 'به‌موقع',
  'quality': 'کیفیت',
  'kpi_score': 'امتیاز KPI',
  'welcome': 'خوش آمدید',
  'performance_overview': 'نمای کلی عملکرد',
};

const EN: Record<string, string> = {
  'app.title': 'AMATIS',
  'app.subtitle': 'Rasha Amatis',
  'dashboard': 'Dashboard',
  'profile': 'Profile',
  'notifications': 'Notifications',
  'chat': 'Chat',
  'tasks': 'Tasks',
  'my_tasks': 'My Tasks',
  'team_tasks': 'Team Tasks',
  'calendar': 'Work Calendar',
  'daily_checklist': 'Daily Checklist',
  'weekly_checklist': 'Weekly Checklist',
  'my_performance': 'My Performance',
  'my_training': 'My Trainings',
  'team': 'My Team',
  'reports': 'Reports',
  'work_report': 'Work Report',
  'evaluations': 'Evaluations',
  'assign_training': 'Assign Training',
  'task_templates': 'Task Templates',
  'projects': 'Projects',
  'employees': 'Employees',
  'kpi': 'KPI & Formulas',
  'settings': 'Settings',
  'audit': 'Audit Logs',
  'logout': 'Logout',
  'search': 'Search',
  'save': 'Save',
  'cancel': 'Cancel',
  'delete': 'Delete',
  'edit': 'Edit',
  'create': 'Create',
  'loading': 'Loading...',
  'no_data': 'No data found',
  'error': 'Error',
  'success': 'Success',
  'confirm_delete': 'Are you sure?',
  'new_employee': 'New Employee',
  'new_project': 'New Project',
  'new_task': 'New Task',
  'export': 'Export',
  'export_excel': 'Export Excel',
  'export_pdf': 'Export PDF',
  'total': 'Total',
  'completed': 'Completed',
  'in_progress': 'In Progress',
  'delayed': 'Delayed',
  'need_revision': 'Needs Revision',
  'on_time': 'On Time',
  'quality': 'Quality',
  'kpi_score': 'KPI Score',
  'welcome': 'Welcome',
  'performance_overview': 'Performance Overview',
};

const I18nContext = createContext<I18nContextType>({
  lang: 'fa',
  setLang: () => {},
  t: (k) => FA[k] || k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fa');

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored) setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.lang = l === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback((key: string) => {
    const dict = lang === 'fa' ? FA : EN;
    return dict[key] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);