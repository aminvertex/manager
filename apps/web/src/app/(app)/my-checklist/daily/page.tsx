'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ClipboardCheck, CheckCircle2, LockKeyhole } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { DAILY_CHECKLIST_ITEMS } from '@amatis/shared';
import { toPersianDigits, toJalaliDate, localDateKey } from '@/lib/date';
import { ChecklistCalendar } from '@/components/checklists/checklist-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Answer = 'YES' | 'NO' | 'NA';

export default function DailyChecklistPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const empId = user?.employeeProfile?.id;
  const date = localDateKey();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(date);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: history, isLoading } = useQuery({
    queryKey: ['daily-checklist', empId],
    queryFn: () => api.get<Array<{ date: string; completionRate: number; items: Record<string, string> }>>(`/checklists/daily/${empId}`),
    enabled: !!empId,
  });

  const today = history?.find((h) => h.date.slice(0, 10) === selectedDate);
  const { data: schedule } = useQuery({
    queryKey: ['checklist-schedule'],
    queryFn: () => api.get<{ dailyStartHour: number; dailyEndHour: number; dailyEndMinute: number }>('/checklists/schedule'),
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const dailyStart = new Date(now); dailyStart.setHours(schedule?.dailyStartHour ?? 0, 0, 0, 0);
  const dailyEnd = new Date(now); dailyEnd.setHours(schedule?.dailyEndHour ?? 23, schedule?.dailyEndMinute ?? 50, 0, 0);
  const locked = now < dailyStart || now >= dailyEnd;
  const remainingSeconds = Math.max(0, Math.floor((dailyEnd.getTime() - now.getTime()) / 1000));
  const countdown = `${toPersianDigits(Math.floor(remainingSeconds / 3600).toString().padStart(2, '0'))}:${toPersianDigits(Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0'))}:${toPersianDigits((remainingSeconds % 60).toString().padStart(2, '0'))}`;
  const isToday = selectedDate === date;

  useEffect(() => {
    setAnswers(today?.items ? today.items as Record<string, Answer> : {});
  }, [today?.date, selectedDate]);

  const autoSave = useMutation({
    mutationFn: (items: Record<string, Answer>) => api.post(`/checklists/daily/${empId}`, { date: selectedDate, items }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-checklist'] }); setSaving(false); },
    onError: () => setSaving(false),
  });

  const handleClick = (item: string, opt: Answer) => {
    const next = { ...answers, [item]: opt };
    setAnswers(next);
    setSaving(true);
    autoSave.mutate(next);
  };

  const answered = Object.values(answers).filter((v) => v === 'YES' || v === 'NO').length;
  const total = DAILY_CHECKLIST_ITEMS.length;
  const completion = total > 0 ? Math.round((answered / total) * 100) : 0;

  const startDate = user?.employeeProfile?.startDate ? localDateKey(new Date(user.employeeProfile.startDate)) : null;
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">چک‌لیست روزانه</h1>
        <p className="text-muted-foreground text-sm">بررسی روند روزانه کاری و رعایت فرآیندها</p>
      </div>

      {today && !autoSave.isPending && (
        <Card className="bg-success/5 border-success/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">چک‌لیست امروز ثبت شده است</span>
            </div>
            <span className="text-success font-bold">{toPersianDigits(today.completionRate)}٪</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>تقویم وضعیت روزانه</CardTitle><CardDescription>تیک: کامل، تعجب: ناقص، ضربدر: بدون ثبت</CardDescription></CardHeader>
        <CardContent><ChecklistCalendar month={calendarMonth} records={history || []} selected={selectedDate} onSelect={(key) => { setSelectedDate(key); setDetailsDate(key); }} onMonthChange={setCalendarMonth} disabled={(key) => key !== date || (!!startDate && key < startDate)} showEmpty={(key) => key <= date && (!startDate || key >= startDate)} /></CardContent>
      </Card>
      <Card className={!isToday || locked ? 'relative overflow-hidden' : ''}>
        {(!isToday || locked) && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/65 backdrop-blur-sm"><div className="text-center"><LockKeyhole className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm font-medium">{locked ? 'مهلت ثبت امروز ساعت ۲۳:۵۰ به پایان رسیده است' : 'فقط چک‌لیست امروز قابل ثبت است'}</p></div></div>}
        <CardHeader>
          <CardTitle className="flex items-center justify-between"><span>آیتم‌های امروز</span><span className="text-sm text-primary">{isToday && !locked ? `زمان باقی‌مانده ${countdown}` : 'قفل شده'}</span></CardTitle>
          <CardDescription>{toPersianDigits(answered)} از {toPersianDigits(total)} پاسخ داده شده</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAILY_CHECKLIST_ITEMS.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm flex-1">{item}</span>
              <div className="flex gap-1.5">
                {(['YES', 'NO', 'NA'] as Answer[]).map((opt) => (
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
          <div className="pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">درصد تکمیل</span>
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
      </div>
      <Dialog open={!!detailsDate} onOpenChange={(open) => !open && setDetailsDate(null)}>
        <DialogContent><DialogHeader><DialogTitle>جزئیات چک‌لیست {detailsDate}</DialogTitle></DialogHeader>
          <div className="space-y-2">{(history?.find((h) => h.date.slice(0, 10) === detailsDate)?.items ? Object.entries(history.find((h) => h.date.slice(0, 10) === detailsDate)!.items) : []).map(([item, value]) => <div key={item} className="flex justify-between rounded-lg border p-2 text-sm"><span>{item}</span><Badge variant="outline">{value}</Badge></div>)}</div>
        </DialogContent>
      </Dialog>

      {history && history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">تاریخچه روزهای قبل</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <div key={h.date} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">چک‌لیست {toJalaliDate(h.date)}</span>
                <Badge className={h.completionRate >= 80 ? 'bg-success/15 text-success' : h.completionRate >= 50 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                  {toPersianDigits(h.completionRate)}٪
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}