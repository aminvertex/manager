'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { toPersianDigits } from '@/lib/date';
import { toJalaliDate } from '@/lib/date';
import Link from 'next/link';

interface Employee {
  id: string; firstName: string; lastName: string; employeeCode: string;
  position?: string; collaborationStatus: string; skillLevel?: string;
  user: { mobile: string; isActive: boolean };
  supervisor?: { firstName: string; lastName: string };
  primaryProject?: { name: string };
}

export default function SupervisorTeamPage() {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['supervisor-team'],
    queryFn: () => api.get<{ success: boolean; data: Employee[]; meta: { total: number } }>('/employees?limit=50'),
  });

  const { data: taskStats } = useQuery({
    queryKey: ['supervisor-team-stats'],
    queryFn: () => api.get<{ data: { total: number; completed: number; pending: number; delayed: number } }>('/tasks?limit=1&stats=true'),
  });

  const team = teamData?.data || [];
  const stats = taskStats?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تیم من</h1>
        <p className="text-muted-foreground">{toPersianDigits(team.length)} عضو تیم</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">کل اعضا</p><p className="text-2xl font-bold">{toPersianDigits(team.length)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-sm text-muted-foreground">تسک‌های تکمیل</p><p className="text-2xl font-bold">{toPersianDigits(stats?.completed || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-sm text-muted-foreground">در حال انجام</p><p className="text-2xl font-bold">{toPersianDigits(stats?.pending || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-sm text-muted-foreground">تأخیر</p><p className="text-2xl font-bold">{toPersianDigits(stats?.delayed || 0)}</p></div></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {team.map((emp) => (
            <Link key={emp.id} href={`/supervisor/tasks?employeeId=${emp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">{getInitials(emp.firstName, emp.lastName)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.position || '—'}</p>
                    </div>
                    <Badge variant={emp.user.isActive ? 'default' : 'secondary'}>{emp.user.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>کد پرسنلی</span><span>{toPersianDigits(emp.employeeCode)}</span></div>
                  {emp.primaryProject && <div className="flex justify-between"><span>پروژه اصلی</span><span>{emp.primaryProject.name}</span></div>}
                  <div className="flex justify-between"><span>وضعیت همکاری</span><span>{emp.collaborationStatus === 'ACTIVE' ? 'فعال' : emp.collaborationStatus === 'PROBATION' ? 'آزمایشی' : 'پایان یافته'}</span></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}