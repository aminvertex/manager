'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ClipboardCheck, CheckCircle2, LockKeyhole } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toPersianDigits } from '@/lib/date';
import { ChecklistCalendar } from '@/components/checklists/checklist-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const WEEKLY_ITEMS = [
  'تمام Taskهای هفته بررسی شد',
  'Taskهای تأخیردار شناسایی شد',
  'Taskهای نیازمند اصلاح بررسی شد',
  'پرونده‌های ناقص مشخص شد',
  'کیفیت خروجی‌ها بررسی شد',
  'خطاهای پرتکرار شناسایی شد',
  'آموزش موردنیاز مشخص شد',
  'مشکلات فرآیندی ثبت شد',
  'پیشنهاد بهبود ثبت شد',
  'اهداف هفته بعد تعیین شد',
];

export default function WeeklyChecklistPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const empId = user?.employeeProfile?.id;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - dayOfWeek);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + (6 - dayOfWeek));

  const { data: existing } = useQuery({
    queryKey: ['weekly-checklist', empId],
    queryFn: async () => {
      if (!empId) return null;
      const res = await api.get<{ data: any }>(`/checklists/weekly/${empId}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!empId,
  });
  const current = existing?.find((item: any) => item.weekStart?.slice(0, 10) === weekStart.toISOString().slice(0, 10));
  const locked = today.getDay() > 5 || (today.getDay() === 5 && (today.getHours() > 23 || (today.getHours() === 23 && today.getMinutes() >= 50)));

  const submit = useMutation({
    mutationFn: (items: Record<string, string>) => api.post(`/checklists/weekly/${empId}`, {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      items,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-checklist'] }); setSaving(false); },
    onError: () => setSaving(false),
  });

  useEffect(() => {
    if (current?.items) setAnswers(current.items as Record<string, string>);
  }, [current?.weekStart]);

  const handleClick = (item: string, opt: string) => {
    const next = { ...answers, [item]: opt };
    setAnswers(next);
    setSaving(true);
    submit.mutate(next);
  };

  const answered = Object.values(answers).filter((v) => v === 'YES' || v === 'NO').length;
  const total = WEEKLY_ITEMS.length;
  const completion = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">چک‌لیست هفتگی</h1>
        <p className="text-muted-foreground text-sm">بررسی فعالیت‌های هفتگی</p>
      </div>
      <Card><CardHeader><CardTitle>تقویم وضعیت هفتگی</CardTitle><CardDescription>هفته جاری تا جمعه ساعت ۲۳:۵۰ قابل ثبت است</CardDescription></CardHeader><CardContent><ChecklistCalendar month={today} records={(existing || []).map((item: any) => ({ date: item.weekStart, weekStart: item.weekStart, completionRate: item.completionRate, items: item.items }))} selected={weekStart.toISOString().slice(0, 10)} onSelect={setDetailsDate} disabled={(key) => key !== weekStart.toISOString().slice(0, 10)} /></CardContent></Card>

      <Card className={locked ? 'relative overflow-hidden' : ''}>
        {locked && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/65 backdrop-blur-sm"><div className="text-center"><LockKeyhole className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm">مهلت ثبت چک‌لیست هفتگی به پایان رسیده است</p></div></div>}
        <CardHeader>
          <CardTitle>بررسی هفته</CardTitle>
          <CardDescription>هفته {toPersianDigits(Math.ceil(today.getDate() / 7))} ماه جاری</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEEKLY_ITEMS.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm flex-1">{item}</span>
              <div className="flex gap-1.5">
                {['YES', 'NO', 'NA'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleClick(item, opt)}
                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                      answers[item] === opt
                        ? opt === 'YES' ? 'bg-success text-white border-success'
                        : opt === 'NO' ? 'bg-destructive text-white border-destructive'
                        : 'bg-muted border-muted-foreground/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {opt === 'YES' ? 'بله' : opt === 'NO' ? 'خیر' : 'نامربوط'}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">تکمیل چک‌لیست</span>
              <span className="font-medium">{toPersianDigits(completion)}٪</span>
            </div>
            <Progress value={completion} />
            <div className="flex items-center justify-end gap-2 mt-3 text-xs">
              {saving ? (
                <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> در حال ذخیره...</span>
              ) : answered > 0 ? (
                <span className="text-success flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> ذخیره شد</span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!detailsDate} onOpenChange={(open) => !open && setDetailsDate(null)}><DialogContent><DialogHeader><DialogTitle>جزئیات چک‌لیست هفتگی</DialogTitle></DialogHeader><div className="space-y-2">{Object.entries((existing?.find((item: any) => item.weekStart?.slice(0, 10) === detailsDate)?.items || {}) as Record<string, string>).map(([item, value]) => <div key={item} className="flex justify-between rounded-lg border p-2 text-sm"><span>{item}</span><Badge variant="outline">{value}</Badge></div>)}</div></DialogContent></Dialog>
    </div>
  );
}