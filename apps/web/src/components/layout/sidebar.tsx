'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  LogOut,
  Brain,
  User,
  ListTodo,
  ClipboardCheck,
  BarChart3,
  Bell,
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  FileCheck2,
  Award,
  Activity,
  Shield,
  Target,
  Clock,
  MessagesSquare,
} from 'lucide-react';
import { RoleCode } from '@amatis/types';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { cn, getInitials, resolveAvatarUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NavItem {
  key: string;
  label: string;
  labelKey?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: RoleCode[];
}

const navItems: NavItem[] = [
  // عمومی — همه نقش‌ها
  { key: 'dash', label: 'داشبورد', labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'profile', label: 'پروفایل', labelKey: 'profile', href: '/profile', icon: User },
  { key: 'notifications', label: 'اعلان‌ها', labelKey: 'notifications', href: '/notifications', icon: Bell },
  { key: 'chat', label: 'پیام‌ها', labelKey: 'chat', href: '/chat', icon: MessagesSquare },

  // کارشناس
  { key: 'my-tasks', label: 'تسک‌های من', labelKey: 'my_tasks', href: '/my-tasks', icon: ListTodo, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'calendar', label: 'تقویم کاری', labelKey: 'calendar', href: '/calendar', icon: CalendarDays, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'daily-checklist', label: 'چک‌لیست روزانه', labelKey: 'daily_checklist', href: '/my-checklist/daily', icon: ClipboardCheck, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'weekly-checklist', label: 'چک‌لیست هفتگی', labelKey: 'weekly_checklist', href: '/my-checklist/weekly', icon: ClipboardCheck, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'admin-checklists', label: 'مرکز چک‌لیست‌ها', href: '/admin/checklists', icon: ClipboardCheck, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'my-performance', label: 'عملکرد من', labelKey: 'my_performance', href: '/my-performance', icon: BarChart3, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },
  { key: 'my-training', label: 'آموزش‌های من', labelKey: 'my_training', href: '/my-training', icon: GraduationCap, roles: [RoleCode.EMPLOYEE, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SUPERVISOR, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },

  // سرپرست
  { key: 'team', label: 'تیم من', labelKey: 'team', href: '/supervisor/team', icon: Users, roles: [RoleCode.SUPERVISOR] },
  { key: 'sup-tasks', label: 'تسک‌های تیم', labelKey: 'team_tasks', href: '/supervisor/tasks', icon: ListTodo, roles: [RoleCode.SUPERVISOR, RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'sup-reports', label: 'گزارش کاری', labelKey: 'work_report', href: '/supervisor/reports', icon: FileSpreadsheet, roles: [RoleCode.SUPERVISOR] },
  { key: 'sup-evaluations', label: 'ارزیابی عملکرد', labelKey: 'evaluations', href: '/supervisor/evaluations', icon: Award, roles: [RoleCode.SUPERVISOR] },
  { key: 'sup-training', label: 'تعیین آموزش', labelKey: 'assign_training', href: '/supervisor/training', icon: GraduationCap, roles: [RoleCode.SUPERVISOR] },
  { key: 'sup-templates', label: 'تسک‌ها', labelKey: 'tasks', href: '/admin/task-templates', icon: FileCheck2, roles: [RoleCode.SUPERVISOR] },
  { key: 'sup-projects', label: 'پروژه‌ها', labelKey: 'projects', href: '/admin/projects', icon: FolderKanban, roles: [RoleCode.SUPERVISOR, RoleCode.EXPERT_L1, RoleCode.EXPERT_L2, RoleCode.EXPERT_L3, RoleCode.SALES_CONSULTANT, RoleCode.TECH_COMMITTEE_MEMBER, RoleCode.TECH_COMMITTEE_MANAGER] },

  // مدیریت ارشد (Executive / CEO / Admin)
  { key: 'employees', label: 'مدیریت کارکنان', labelKey: 'employees', href: '/admin/employees', icon: Users, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'projects', label: 'مدیریت پروژه‌ها', labelKey: 'projects', href: '/admin/projects', icon: FolderKanban, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'templates', label: 'تسک‌ها', labelKey: 'tasks', href: '/admin/task-templates', icon: FileCheck2, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'evaluations', label: 'ارزیابی‌ها', labelKey: 'evaluations', href: '/admin/evaluations', icon: Award, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'reports', label: 'گزارش‌ها', labelKey: 'reports', href: '/admin/reports', icon: FileSpreadsheet, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'kpi', label: 'KPI و فرمول‌ها', labelKey: 'kpi', href: '/admin/kpi', icon: Target, roles: [RoleCode.SUPER_ADMIN, RoleCode.CEO] },
  { key: 'settings', label: 'تنظیمات', labelKey: 'settings', href: '/admin/settings', icon: Settings, roles: [RoleCode.SUPER_ADMIN] },
  { key: 'audit', label: 'گزارش‌های حسابرسی', labelKey: 'audit', href: '/admin/audit-logs', icon: Shield, roles: [RoleCode.SUPER_ADMIN] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const { t } = useI18n();

  const { data: chatUnreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => api.get<{ data: { count: number } }>('/chat/unread-count'),
    refetchInterval: 20000,
  });
  const chatUnread = chatUnreadData?.data?.count || 0;

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.some((role) => hasRole(role)),
  );

  const profile = user?.employeeProfile;

  return (
    <aside className="fixed top-0 right-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-l border-border/70 bg-card/90 shadow-2xl shadow-primary/5 backdrop-blur-xl">
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-border/70 px-6 py-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-lg shadow-primary/25">
          <Brain className="h-5 w-5" />
        </div>
        <div className="relative">
          <h1 className="text-lg font-extrabold tracking-tight">آماتیس</h1>
          <p className="text-xs text-muted-foreground">راشا آماتیس</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10'
                  : 'text-muted-foreground hover:-translate-x-0.5 hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive && 'text-primary')} />
              <span className="flex-1">{t(item.labelKey || item.label)}</span>
              {item.key === 'chat' && chatUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {chatUnread > 99 ? '۹۹+' : chatUnread.toLocaleString('fa-IR')}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/70 bg-muted/20 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 text-sm font-medium text-primary ring-2 ring-background">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveAvatarUrl(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : profile ? getInitials(profile.firstName, profile.lastName) : '؟'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile ? `${profile.firstName} ${profile.lastName}` : user?.mobile}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile?.position || user?.roles[0]}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 ml-2" />
          خروج
        </Button>
      </div>
    </aside>
  );
}

function NotificationBell() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  });
  const count = data?.count || 0;
  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/notifications')}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {count > 99 ? '۹۹+' : count.toLocaleString('fa-IR')}
        </span>
      )}
    </Button>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_35%),hsl(var(--background))]">
      <Sidebar />
      <div className="mr-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/70 bg-background/75 px-6 backdrop-blur-xl">
          <div className="flex-1" />
          <LangToggle />
          <ThemeToggle />
          <NotificationBell />
        </header>
        <main className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
