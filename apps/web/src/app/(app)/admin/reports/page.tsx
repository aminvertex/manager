'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet, Download, FileText } from 'lucide-react';
import { toJalali, toPersianDigits } from '@/lib/date';
import { JalaliMonthPicker } from '@/components/ui/jalali-month-picker';
import { downloadFile } from '@/lib/utils';
import { useState } from 'react';

export default function ReportsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['monthly-reviews', period],
    queryFn: () => api.get<{ data: Array<{
      period: string; employee: { firstName: string; lastName: string; employeeCode: string };
      totalTasks: number; completionRate: number; onTimeRate: number; averageQuality: number | null;
      revisionCount: number; kpiScore: number | null; performanceRank: string | null;
    }> }>('/monthly-reviews?period=' + period),
  });

  const { data: exec } = useQuery({
    queryKey: ['exec-report', period],
    queryFn: () => api.get<{
      cards: {
        totalEmployees: number; totalTasks: number; completionRate: number;
        onTimeRate: number; averageQuality: number | null; delayedTasks: number;
        needRevisionTasks: number; averagePerformance: number | null;
      };
    }>('/dashboard/executive?period=' + period),
  });

  const downloadCsv = () => {
    const rows = reviews?.data || [];
    const header = 'Employee Code,Name,Period,Total Tasks,Completion Rate,On-Time Rate,Avg Quality,Revisions,KPI Score,Rank';
    const lines = rows.map((r) => [r.employee.employeeCode, `${r.employee.firstName} ${r.employee.lastName}`, r.period, r.totalTasks, r.completionRate, r.onTimeRate, r.averageQuality ?? '', r.revisionCount, r.kpiScore ?? '', r.performanceRank ?? ''].join(','));
    const csv = '\uFEFF' + [header, ...lines].join('');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">گزارش‌ها</h1>
          <p className="text-muted-foreground text-sm">گزارش عملکرد ماهانه کارشناسان</p>
        </div>
        <div className="flex gap-2">
          <JalaliMonthPicker value={period} onChange={setPeriod} />
          <Button variant="outline" onClick={() => downloadFile(`/exports/monthly/${period}/pdf`, `گزارش-${period}.pdf`)}><FileText className="h-4 w-4 ml-2" /> PDF</Button>
          <Button variant="outline" onClick={() => downloadFile(`/exports/monthly/${period}`, `گزارش-${period}.xlsx`)}><FileText className="h-4 w-4 ml-2" />خروجی Excel</Button>
          <Button variant="outline" onClick={downloadCsv}><Download className="h-4 w-4 ml-2" />خروجی CSV</Button>
        </div>
      </div>

      {exec?.cards && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">خلاصه ماه {toJalali(period + '-01')}</CardTitle>
            <CardDescription>{toPersianDigits(exec.cards.totalEmployees)} کارمند • {toPersianDigits(exec.cards.totalTasks)} تسک • {toPersianDigits(exec.cards.completionRate)}٪ تکمیل</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">به موقع: {toPersianDigits(exec.cards.onTimeRate)}٪</Badge>
            <Badge variant="secondary">میانگین کیفیت: {exec.cards.averageQuality != null ? toPersianDigits(exec.cards.averageQuality) : '—'}</Badge>
            <Badge variant="secondary">تأخیر: {toPersianDigits(exec.cards.delayedTasks)}</Badge>
            <Badge variant="secondary">اصلاح: {toPersianDigits(exec.cards.needRevisionTasks)}</Badge>
            <Badge variant="secondary">میانگین KPI: {exec.cards.averagePerformance != null ? toPersianDigits(exec.cards.averagePerformance) : '—'}</Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مبنای گزارش</CardTitle>
          <CardDescription>این گزارش بر اساس داده‌های زیر تهیه شده است</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'تسک‌های تکمیل‌شده', desc: 'وضعیت APPROVED در بازه زمانی', icon: '✓' },
              { label: 'چک‌لیست روزانه', desc: 'میانگین تکمیل روزانه در بازه', icon: '☐' },
              { label: 'ارزیابی سرپرست', desc: 'میانگین امتیاز ارزیابی‌های ثبت‌شده', icon: '★' },
              { label: 'KPI ماهانه', desc: 'محاسبه خودکار از تسک + چک‌لیست + ارزیابی', icon: '📊' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">{item.icon} {item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">کارمند</th>
                  <th className="text-right p-3 font-medium">تسک‌ها</th>
                  <th className="text-right p-3 font-medium">تکمیل</th>
                  <th className="text-right p-3 font-medium">به موقع</th>
                  <th className="text-right p-3 font-medium">کیفیت</th>
                  <th className="text-right p-3 font-medium">اصلاحات</th>
                  <th className="text-right p-3 font-medium">KPI</th>
                  <th className="text-right p-3 font-medium">رتبه</th>
                </tr>
              </thead>
              <tbody>
                {(reviews?.data || []).map((r) => (
                  <tr key={r.employee.employeeCode} className="border-b">
                    <td className="p-3">{r.employee.firstName} {r.employee.lastName}<span className="text-xs text-muted-foreground"> ({r.employee.employeeCode})</span></td>
                    <td className="p-3">{toPersianDigits(r.totalTasks)}</td>
                    <td className="p-3">{toPersianDigits(r.completionRate)}٪</td>
                    <td className="p-3">{toPersianDigits(r.onTimeRate)}٪</td>
                    <td className="p-3">{r.averageQuality != null ? toPersianDigits(r.averageQuality) : '—'}</td>
                    <td className="p-3">{toPersianDigits(r.revisionCount)}</td>
                    <td className="p-3">
                      <Badge className={(r.kpiScore ?? 0) >= 80 ? 'bg-success/15 text-success' : (r.kpiScore ?? 0) >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                        {r.kpiScore != null ? toPersianDigits(r.kpiScore) : '—'}
                      </Badge>
                    </td>
                    <td className="p-3">{r.performanceRank || '—'}</td>
                  </tr>
                ))}
                {(reviews?.data || []).length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">گزارشی برای این ماه تولید نشده است</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}