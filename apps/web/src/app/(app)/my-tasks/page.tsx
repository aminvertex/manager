'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, AlertTriangle, RefreshCcw, ListTodo, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES, PRIORITY_LABELS, PRIORITY_STYLES } from '@/lib/labels';
import { toJalaliDate, toPersianDigits } from '@/lib/date';
import { toast } from '@/hooks/use-toast';

interface TaskItem {
  id: string;
  assignmentCode: string;
  status: string;
  progress: number;
  priority: string;
  deadline: string | null;
  isDelayed: boolean;
  delayDays: number;
  revisionCount: number;
  qualityScore: number | null;
  taskTemplate: { name: string; category: string; expectedOutput: string | null };
  project: { id: string; name: string } | null;
}

function StatCard({ title, value, icon: Icon, color = 'text-primary', onClick }: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color?: string; onClick?: () => void;
}) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{toPersianDigits(value)}</div>
      </CardContent>
    </Card>
  );
}

export default function MyTasksPage() {
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'DELAYED' | 'NEED_REVISION' | 'IN_PROGRESS'>('ALL');
  const [projectFilter, setProjectFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['my-tasks-projects'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; name: string }[] }>('/projects?limit=100'),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-tasks-stats'],
    queryFn: () => api.get<{ data: { total: number; inProgress: number; delayed: number; needRevision: number; todayCount: number } }>('/tasks/my/stats'),
  });

  const { data: tasks, isLoading: tasksLoading, error } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get<{ data: TaskItem[] }>('/tasks'),
  });

  const filtered = (tasks?.data || []).filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'DELAYED') return t.isDelayed || (t.deadline && new Date() > new Date(t.deadline) && !['APPROVED','CANCELLED'].includes(t.status));
    if (filter === 'NEED_REVISION') return t.status === 'NEED_REVISION';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'TODAY') {
      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      return t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) < tomorrow;
    }
    return true;
  }).filter((t) => !projectFilter || t.project?.id === projectFilter);

  const s = stats?.data ?? ({} as { total: number; inProgress: number; delayed: number; needRevision: number; todayCount: number });
  const totalTasks = filtered.length;

  const startTask = useMutation({
    mutationFn: (taskId: string) => api.patch(`/tasks/${taskId}/status`, { status: 'IN_PROGRESS' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); qc.invalidateQueries({ queryKey: ['my-tasks-stats'] }); toast({ title: 'تسک شروع شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as Error).message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">تسک‌های من</h1>
          <p className="text-muted-foreground text-sm">مدیریت و پیگیری وظایف روزانه</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setIsRefreshing(true);
            await qc.invalidateQueries({ queryKey: ['my-tasks'] });
            setTimeout(() => setIsRefreshing(false), 600);
          }}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 ml-2" />}
          {isRefreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="تسک‌های امروز" value={s.todayCount || 0} icon={CalendarDays} onClick={() => setFilter('TODAY')} />
        <StatCard title="در حال انجام" value={s.inProgress || 0} icon={Clock} color="text-blue-600" onClick={() => setFilter('IN_PROGRESS')} />
        <StatCard title="عقب افتاده" value={s.delayed || 0} icon={AlertTriangle} color="text-destructive" onClick={() => setFilter('DELAYED')} />
        <StatCard title="نیازمند اصلاح" value={s.needRevision || 0} icon={RefreshCcw} color="text-warning" onClick={() => setFilter('NEED_REVISION')} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['ALL', 'همه'],
          ['TODAY', 'امروز'],
          ['IN_PROGRESS', 'در حال انجام'],
          ['DELAYED', 'عقب افتاده'],
          ['NEED_REVISION', 'نیازمند اصلاح'],
        ] as const).map(([key, label]) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
        <Select value={projectFilter} onValueChange={setProjectFilter} className="max-w-[200px] h-9 text-sm">
          <option value="">همه پروژه‌ها</option>
          {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {tasksLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : error ? (
        <Card className="p-8 text-center text-destructive">خطا در دریافت تسک‌ها</Card>
      ) : totalTasks === 0 ? (
        <Card className="p-10 text-center">
          <ListTodo className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">تسکی یافت نشد</p>
          <p className="text-sm text-muted-foreground mt-1">هنگامی که سرپرست تسکی اختصاص دهد اینجا نمایش داده می‌شود</p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((t) => {
            const isDelayed = t.isDelayed || (t.deadline && new Date() > new Date(t.deadline) && !['APPROVED','CANCELLED'].includes(t.status));
            return (
              <Card key={t.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <Link href={`/tasks/${t.id}`} className="font-semibold hover:text-primary hover:underline line-clamp-1">
                        {t.taskTemplate.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {t.taskTemplate.category} {t.project ? `• ${t.project.name}` : ''}
                      </p>
                    </div>
                    <Badge className={TASK_STATUS_STYLES[t.status] || ''}>
                      {isDelayed ? 'عقب افتاده' : TASK_STATUS_LABELS[t.status]}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>پیشرفت</span>
                      <span>{toPersianDigits(t.progress)}٪</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className={PRIORITY_STYLES[t.priority] || ''}>اولویت: {PRIORITY_LABELS[t.priority] || t.priority}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      مهلت: {toJalaliDate(t.deadline)}
                    </span>
                    {t.revisionCount > 0 && (
                      <span className="text-warning">اصلاحات: {toPersianDigits(t.revisionCount)}</span>
                    )}
                    {isDelayed && t.deadline && (
                      <span className="text-destructive">تأخیر: {toPersianDigits(Math.max(1, Math.ceil((new Date().getTime() - new Date(t.deadline).getTime()) / 86400000)))} روز</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/tasks/${t.id}`} className="flex-1">
                      <Button size="sm" className="w-full">مشاهده</Button>
                    </Link>
                    {t.status === 'ASSIGNED' || t.status === 'NOT_STARTED' ? (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => startTask.mutate(t.id)}>شروع</Button>
                    ) : t.status === 'IN_PROGRESS' || t.status === 'NEED_REVISION' ? (
                      <Link href={`/tasks/${t.id}?action=submit`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">تحویل</Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
