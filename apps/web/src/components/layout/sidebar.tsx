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
    <aside className="fixed top-0 right-0 z-40 h-screen w-[var(--sidebar-width)] border-l bg-card flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg">آماتیس</h1>
          <p className="text-xs text-muted-foreground">راشا آماتیس</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
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

      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium overflow-hidden">
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
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="mr-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
          <div className="flex-1" />
          <LangToggle />
          <ThemeToggle />
          <NotificationBell />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
