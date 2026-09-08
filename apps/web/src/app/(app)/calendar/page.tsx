'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Loader2, ChevronRight, ChevronLeft, Plus, CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES } from '@/lib/labels';
import { toPersianDigits, toJalaliParts, jalaliMonthGrid, j2g, jalaliDateKey, toJalaliMonthTitle, JALALI_WEEKDAYS, JALALI_MONTHS } from '@/lib/date';

interface TaskItem {
  id: string;
  status: string;
  deadline: string | null;
  notes?: string | null;
  isPersonal?: boolean;
  taskTemplate: { name: string } | null;
}

interface TemplateItem {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = toJalaliParts(new Date());
  const [jy, setJy] = useState(today.jy);
  const [jm, setJm] = useState(today.jm);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [form, setForm] = useState({ taskTemplateId: '', priority: 'MEDIUM', personalTitle: '', personalDesc: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-tasks', jy, jm],
    queryFn: () => api.get<{ data: TaskItem[] }>('/tasks?limit=500'),
  });

  const tasksByDate: Record<string, TaskItem[]> = {};
  (data?.data || []).forEach((t) => {
    if (!t.deadline) return;
    const d = new Date(t.deadline);
    const key = d.toISOString().slice(0, 10);
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  });

  const cells = jalaliMonthGrid(jy, jm);

  const navigate = (dir: number) => {
    let nj = jm + dir;
    let ny = jy;
    if (nj < 1) { nj = 12; ny -= 1; }
    if (nj > 12) { nj = 1; ny += 1; }
    setJm(nj); setJy(ny);
  };

  const openDay = (jd: number) => {
    const key = jalaliDateKey(jy, jm, jd);
    setSelectedLabel(`${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`);
    setSelectedDate(key);
  };

  const createTask = useMutation({
    mutationFn: (body: any) => api.post('/tasks', body),
    onSuccess: () => {
      setForm({ taskTemplateId: '', priority: 'MEDIUM', personalTitle: '', personalDesc: '' });
      qc.invalidateQueries({ queryKey: ['calendar-tasks'] });
      setSelectedDate(null);
    },
  });

  const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تقویم کاری</h1>
          <p className="text-muted-foreground">مهلت‌های تسک‌ها • تقویم شمسی</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronRight className="h-4 w-4" /></Button>
          <div className="text-center font-medium min-w-[160px]">{toJalaliMonthTitle(jy, jm)}</div>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => { setJy(today.jy); setJm(today.jm); }}>امروز</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {JALALI_WEEKDAYS.map((d, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="min-h-24 rounded-lg" />;
                const key = jalaliDateKey(jy, jm, d);
                const tasks = tasksByDate[key] || [];
                const isToday = d === today.jd && jm === today.jm && jy === today.jy;
                return (
                  <button
                    key={i}
                    onClick={() => openDay(d)}
                    className={`min-h-24 rounded-lg border p-1.5 text-right transition-all ${isToday ? 'border-primary bg-primary/5' : ''} ${tasks.length ? 'hover:shadow-md' : 'hover:bg-accent/50'}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {toPersianDigits(d)}
                    </div>
                    <div className="space-y-1">
                      {tasks.slice(0, 3).map((t) => (
                        <div key={t.id} className={`rounded px-1 py-0.5 text-[10px] truncate ${TASK_STATUS_STYLES[t.status] || 'bg-muted'}`}>
                          {t.taskTemplate ? t.taskTemplate.name : (t.notes || 'تسک شخصی')}
                        </div>
                      ))}
                      {tasks.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{toPersianDigits(tasks.length - 3)} دیگر</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Badge className="bg-success/15 text-success">تأیید شده</Badge> تکمیل</span>
            <span className="flex items-center gap-1"><Badge className="bg-blue-500/15 text-blue-600">در حال انجام</Badge> در حال انجام</span>
            <span className="flex items-center gap-1"><Badge className="bg-warning/15 text-warning">نیازمند اصلاح</Badge> اصلاح</span>
            <span className="flex items-center gap-1"><Badge className="bg-destructive/15 text-destructive">عقب افتاده</Badge> تأخیر</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> تسک‌های {selectedLabel}
            </DialogTitle>
          </DialogHeader>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">تسکی در این روز ثبت نشده است</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.taskTemplate ? t.taskTemplate.name : (t.notes || 'تسک شخصی')}</p>
                    {t.isPersonal && <p className="text-[10px] text-violet-600">تسک شخصی</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{TASK_STATUS_LABELS[t.status] || t.status}</Badge>
                    <Link href={`/tasks/${t.id}`}>
                      <Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">افزودن تسک در این روز</p>
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-3 bg-violet-50/40 dark:bg-violet-950/20">
                <p className="text-xs font-medium text-violet-600">تسک شخصی (فقط برای شما)</p>
                <Input placeholder="عنوان تسک شخصی..." value={form.personalTitle} onChange={(e) => setForm({ ...form, personalTitle: e.target.value })} />
                <Input placeholder="توضیح (اختیاری)..." value={form.personalDesc} onChange={(e) => setForm({ ...form, personalDesc: e.target.value })} />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!form.personalTitle}
                  onClick={() => createTask.mutate({
                    taskName: form.personalTitle,
                    notes: form.personalDesc,
                    isPersonal: true,
                    employeeId: user?.employeeProfile?.id,
                    deadline: selectedDate ? new Date(selectedDate + 'T12:00:00').toISOString() : undefined,
                  })}
                >
                  <Plus className="h-4 w-4 ml-2" /> افزودن تسک شخصی
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}