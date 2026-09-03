'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, CircleAlert, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toJalaliDate } from '@/lib/date';

type RecordItem = { id: string; employeeId: string; date?: string; weekStart?: string; completionRate: number; items: Record<string, string> };
const start = new Date(); start.setDate(1); const end = new Date(); end.setMonth(end.getMonth() + 1); end.setDate(0);
const key = (value: Date) => value.toISOString().slice(0, 10);

export default function AdminChecklistsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [employeeId, setEmployeeId] = useState('');
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-checklists', tab],
    queryFn: () => api.get<{ employees: Array<{ id: string; firstName: string; lastName: string }>; records: RecordItem[] }>(`/checklists/overview?type=${tab}&from=${key(start)}&to=${key(end)}`),
  });
  const records = useMemo(() => (response?.records || []).filter((item) => !employeeId || item.employeeId === employeeId), [response, employeeId]);
  const employee = response?.employees.find((item) => item.id === employeeId);
  const groupedWeeks = records.filter((item) => item.weekStart);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">مرکز چک‌لیست‌ها</h1><p className="text-sm text-muted-foreground">بررسی وضعیت ثبت چک‌لیست کارکنان</p></div>
      <div className="flex gap-2"><button className={`rounded-lg px-4 py-2 ${tab === 'daily' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} onClick={() => setTab('daily')}>روزانه</button><button className={`rounded-lg px-4 py-2 ${tab === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} onClick={() => setTab('weekly')}>هفتگی</button></div>
      <Select value={employeeId} onValueChange={setEmployeeId}><option value="">همه کارکنان</option>{(response?.employees || []).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</Select>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{tab === 'daily' ? 'تقویم روزانه ماه جاری' : 'هفته‌های ماه جاری'}</CardTitle></CardHeader><CardContent>
        {isLoading ? <div className="h-52 animate-pulse rounded-xl bg-muted" /> : tab === 'daily' ? <div className="grid grid-cols-7 gap-2">{Array.from({ length: end.getDate() }, (_, i) => i + 1).map((day) => { const date = new Date(start.getFullYear(), start.getMonth(), day); const items = records.filter((r) => r.date?.slice(0, 10) === key(date)); const item = items[0]; const complete = item?.completionRate >= 100; const partial = item && item.completionRate > 0; return <button key={day} onClick={() => setSelected(item || null)} className="flex h-16 flex-col items-center justify-center rounded-xl border hover:shadow-md"><span>{day}</span>{complete ? <Check className="h-4 w-4 text-success" /> : partial ? <CircleAlert className="h-4 w-4 text-warning" /> : <X className="h-4 w-4 text-destructive/70" />}</button>; })}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{groupedWeeks.map((item) => <button key={item.id} onClick={() => setSelected(item)} className="rounded-xl border p-4 text-right hover:border-primary"><p className="font-medium">هفته {toJalaliDate(item.weekStart!)}</p><Badge>{item.completionRate}%</Badge></button>)}</div>}
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>جزئیات {employee ? `${employee.firstName} ${employee.lastName}` : 'چک‌لیست'}</DialogTitle></DialogHeader>{selected && <div className="space-y-2">{Object.entries(selected.items || {}).map(([item, value]) => <div key={item} className="flex justify-between rounded-lg border p-2 text-sm"><span>{item}</span><Badge variant="outline">{value}</Badge></div>)}</div>}</DialogContent></Dialog>
    </div>
  );
}
