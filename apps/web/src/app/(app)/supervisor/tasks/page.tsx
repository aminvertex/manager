'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, RotateCcw, Search, Plus } from 'lucide-react';
import { toJalaliDate, toPersianDigits } from '@/lib/date';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES } from '@/lib/labels';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';

interface TaskItem {
  id: string; status: string; deadline: string | null; createdAt: string;
  taskTemplate: { name: string };
  employee: { id: string; firstName: string; lastName: string };
}

interface TemplateItem { id: string; name: string; category: string }
interface EmployeeItem { id: string; firstName: string; lastName: string }

export default function SupervisorTasksPage() {
  const params = useSearchParams();
  const { user } = useAuth();
  const employeeId = params.get('employeeId') || '';
  const [status, setStatus] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priority, setPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ taskTemplateId: '', employeeId: employeeId || '', projectId: '', deadline: '', priority: 'MEDIUM' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sup-tasks', employeeId, status, projectFilter, priority, dateFrom, dateTo],
    queryFn: () => api.get<{ success: boolean; data: TaskItem[] }>(
      `/tasks?limit=200${employeeId ? `&employeeId=${employeeId}` : ''}${status ? `&status=${status}` : ''}${projectFilter ? `&projectId=${projectFilter}` : ''}${priority ? `&priority=${priority}` : ''}${dateFrom ? `&from=${dateFrom}` : ''}${dateTo ? `&to=${dateTo}` : ''}`,
    ),
  });

  const { data: templates } = useQuery({
    queryKey: ['sup-templates'],
    queryFn: () => api.get<{ success: boolean; data: TemplateItem[] }>(`/task-templates?limit=100${form.projectId ? `&projectId=${form.projectId}` : ''}`),
    enabled: open,
  });

  const { data: team } = useQuery({
    queryKey: ['sup-team-members'],
    queryFn: () => api.get<{ success: boolean; data: EmployeeItem[] }>(`/employees?limit=100${form.projectId ? `&projectId=${form.projectId}` : ''}`),
    enabled: open,
  });

  const { data: projects } = useQuery({
    queryKey: ['sup-projects-list'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; name: string }[] }>('/projects?limit=100'),
  });

  const tasks = (data?.data || []).filter((t) => !search || t.taskTemplate.name.includes(search));

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sup-tasks'] }),
  });

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sup-tasks'] });
      setOpen(false);
      setForm({ taskTemplateId: '', employeeId: '', projectId: '', deadline: '', priority: 'MEDIUM' });
      toast({ title: 'تسک ایجاد شد' });
    },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{employeeId ? `تسک‌های ${team?.data?.find((e) => e.id === employeeId)?.firstName || 'کارمند'}` : 'تسک‌های تیم'}</h1>
        <p className="text-muted-foreground">{employeeId ? 'مشاهده جزئیات تسک‌های این عضو تیم' : 'مشاهده و تأیید تسک‌های اعضای تیم'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="جستجوی تسک..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <option value="">همه پروژه‌ها</option>
          {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v === 'all' ? '' : v)}>
          <option value="all">همه اولویت‌ها</option><option value="LOW">کم</option><option value="MEDIUM">متوسط</option><option value="HIGH">زیاد</option><option value="URGENT">فوری</option>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Select value={status} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <option value="all">همه وضعیت‌ها</option>
          <option value="PENDING">در انتظار</option>
          <option value="IN_PROGRESS">در حال انجام</option>
          <option value="SUBMITTED">ارسال شده</option>
          <option value="APPROVED">تأیید شده</option>
          <option value="REJECTED">اصلاح</option>
          <option value="DELAYED">عقب افتاده</option>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" /> تسک جدید</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>ایجاد تسک جدید</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>قالب تسک *</Label>
                <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v, taskTemplateId: '', employeeId: '' })}>
                  <option value="">ابتدا پروژه را انتخاب کنید...</option>
                  {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                </div>
                {form.projectId && <div><Label>تسک اختصاصی پروژه *</Label>
                <Select value={form.taskTemplateId} onValueChange={(v) => setForm({ ...form, taskTemplateId: v })}>
                  <option value="">انتخاب قالب...</option>
                  {(templates?.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>}
              {!employeeId && (
                <div><Label>کارشناس *</Label>
                  <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                    <option value="">انتخاب کارشناس...</option>
                    {(team?.data || []).map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </Select>
                </div>
              )}
              {employeeId && (
                <p className="text-xs text-muted-foreground">کارشناس: {team?.data?.find((e) => e.id === employeeId)?.firstName} {team?.data?.find((e) => e.id === employeeId)?.lastName}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>پروژه</Label><p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{projects?.data?.find((p) => p.id === form.projectId)?.name || '—'}</p></div>
                <div><Label>اولویت</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <option value="LOW">کم</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="HIGH">زیاد</option>
                    <option value="URGENT">فوری</option>
                  </Select>
                </div>
              </div>
              <div><Label>مهلت</Label><JalaliDatePicker value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} /></div>
              <Button className="w-full" disabled={!form.taskTemplateId || !form.employeeId} onClick={() => createTask.mutate()}>
                {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                ایجاد تسک
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">تسکی یافت نشد</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${TASK_STATUS_STYLES[t.status] || 'bg-muted'}`}>
                      {t.employee.firstName.charAt(0)}{t.employee.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.taskTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.employee.firstName} {t.employee.lastName}
                        {t.employee.id === user?.employeeProfile?.id && (
                          <Badge className="mr-1 bg-primary/10 text-primary text-[9px] px-1.5 py-0">تسک من</Badge>
                        )}
                        {' • '}مهلت: {toJalaliDate(t.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{TASK_STATUS_LABELS[t.status] || t.status}</Badge>
                    {t.status === 'SUBMITTED' && (
                      <>
                        <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => updateStatus.mutate({ id: t.id, status: 'APPROVED' })}>
                          <CheckCircle2 className="h-4 w-4 ml-1" /> تأیید
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: t.id, status: 'REJECTED' })}>
                          <XCircle className="h-4 w-4 ml-1" /> اصلاح
                        </Button>
                      </>
                    )}
                    {t.status === 'REJECTED' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, status: 'IN_PROGRESS' })}>
                        <RotateCcw className="h-4 w-4 ml-1" /> ارسال مجدد
                      </Button>
                    )}
                    <Link href={`/tasks/${t.id}`}><Button size="sm" variant="outline">جزئیات</Button></Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}