'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileSpreadsheet, ClipboardCheck } from 'lucide-react';
import { toJalaliDate, toPersianDigits } from '@/lib/date';

interface WeeklyItem {
  id: string; weekStart: string; weekEnd: string; completionRate: number;
  performanceScore?: number; strengths?: string; improvementAreas?: string; correctiveActions?: string;
  employee: { firstName: string; lastName: string; employeeCode: string };
}

interface DailyItem {
  date: string; completionRate: number;
  employee: { firstName: string; lastName: string; employeeCode: string };
}

export default function SupervisorReportsPage() {
  const [tab, setTab] = useState<'weekly' | 'daily'>('weekly');
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['sup-reports-team'],
    queryFn: () => api.get<{ data: any[] }>('/employees?limit=100'),
  });

  const team = teamData?.data || [];

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['sup-reports-weekly'],
    queryFn: async () => {
      const results = await Promise.all(
        team.map(async (emp: any) => {
          try {
            const res = await api.get<{ data: WeeklyItem[] }>(`/checklists/weekly/${emp.id}`);
            return res.data || [];
          } catch { return []; }
        }),
      );
      return results.flat();
    },
    enabled: !teamLoading && team.length > 0,
  });

  const items = weeklyData || [];

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['sup-reports-daily'],
    queryFn: async () => {
      const results = await Promise.all(
        team.map(async (emp: any) => {
          try {
            const res = await api.get<{ data: Array<{ date: string; completionRate: number }> }>(`/checklists/daily/${emp.id}`);
            return (res.data || []).map((d) => ({ ...d, employee: emp }));
          } catch { return []; }
        }),
      );
      return results.flat();
    },
    enabled: !teamLoading && team.length > 0,
  });

  const dailyItems = (dailyData || []).filter((d: any) => d.employee) as DailyItem[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">گزارش کاری تیم</h1>
        <p className="text-muted-foreground">چک‌لیست‌های روزانه/هفتگی و عملکرد اعضا</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('weekly')} className={`px-4 py-2 rounded-md text-sm font-medium border ${tab === 'weekly' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>چک‌لیست هفتگی</button>
        <button onClick={() => setTab('daily')} className={`px-4 py-2 rounded-md text-sm font-medium border ${tab === 'daily' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>چک‌لیست روزانه</button>
      </div>

      {tab === 'weekly' ? (
        teamLoading || weeklyLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">گزارشی ثبت نشده است</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {[...items].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map((w) => (
              <Card key={w.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{w.employee.firstName} {w.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {toJalaliDate(w.weekStart)} تا {toJalaliDate(w.weekEnd)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {w.performanceScore != null && (
                        <Badge variant="default">{toPersianDigits(Math.round(w.performanceScore))}٪ عملکرد</Badge>
                      )}
                      <div className="text-left">
                        <p className={`text-lg font-bold ${w.completionRate >= 75 ? 'text-success' : w.completionRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {toPersianDigits(Math.round(w.completionRate))}٪
                        </p>
                        <p className="text-xs text-muted-foreground">تکمیل</p>
                      </div>
                    </div>
                  </div>
                  {w.strengths && <p className="text-sm mt-2"><span className="text-success font-medium">نقاط قوت: </span>{w.strengths}</p>}
                  {w.improvementAreas && <p className="text-sm mt-1"><span className="text-warning font-medium">قابل بهبود: </span>{w.improvementAreas}</p>}
                  {w.correctiveActions && <p className="text-sm mt-1"><span className="text-destructive font-medium">اقدامات اصلاحی: </span>{w.correctiveActions}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        dailyLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : dailyItems.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">چک‌لیست روزانه‌ای ثبت نشده است</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-2">
              {[...dailyItems].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 30).map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{d.employee.firstName} {d.employee.lastName}</p>
                      <p className="text-xs text-muted-foreground">{toJalaliDate(d.date)}</p>
                    </div>
                  </div>
                  <Badge className={d.completionRate >= 80 ? 'bg-success/15 text-success' : d.completionRate >= 50 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                    {toPersianDigits(Math.round(d.completionRate))}٪
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}