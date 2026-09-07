'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, CircleAlert, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChecklistCalendar, ChecklistRecord } from '@/components/checklists/checklist-calendar';
import { jalaliDateKey, jalaliDaysInMonth, localDateKey, toJalaliParts } from '@/lib/date';

type RecordItem = ChecklistRecord & { id: string; employeeId: string; date?: string; weekStart?: string };
type Employee = { id: string; firstName: string; lastName: string; startDate?: string | null };

const monthBounds = (month: Date) => {
  const { jy, jm } = toJalaliParts(month);
  return {
    from: jalaliDateKey(jy, jm, 1),
    to: jalaliDateKey(jy, jm, jalaliDaysInMonth(jy, jm)),
  };
};

export default function AdminChecklistsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [employeeId, setEmployeeId] = useState('');
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const bounds = monthBounds(calendarMonth);
  const { data: employeesResponse } = useQuery({
    queryKey: ['checklist-employees'],
    queryFn: () => api.get<{ data: Employee[] }>('/employees?limit=200'),
  });
  const employees = employeesResponse?.data || [];
  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-checklists', tab, employeeId, bounds.from, bounds.to],
    queryFn: () => api.get<{ employees: Employee[]; records: RecordItem[] }>(`/checklists/overview?type=${tab}&employeeId=${employeeId}&from=${bounds.from}&to=${bounds.to}`),
    enabled: !!employeeId,
  });
  const records = useMemo(() => response?.records || [], [response]);
  const employee = employees.find((item) => item.id === employeeId);
  const selectedRecord = selected || undefined;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مرکز چک‌لیست‌ها</h1>
        <p className="text-sm text-muted-foreground">ابتدا کارمند را انتخاب کنید تا وضعیت واقعی ثبت‌شده از دیتابیس نمایش داده شود.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-lg px-4 py-2 ${tab === 'daily' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} onClick={() => { setTab('daily'); setSelected(null); }}>روزانه</button>
        <button className={`rounded-lg px-4 py-2 ${tab === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} onClick={() => { setTab('weekly'); setSelected(null); }}>هفتگی</button>
      </div>
      <Select value={employeeId} onValueChange={(value) => { setEmployeeId(value); setSelected(null); }}>
        <option value="">انتخاب کارمند</option>
        {employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
      </Select>
      {!employeeId ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">برای مشاهده تقویم، یک کارمند را انتخاب کنید.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{tab === 'daily' ? 'تقویم شمسی روزانه' : 'تقویم شمسی هفتگی'} — {employee?.firstName} {employee?.lastName}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="h-52 animate-pulse rounded-xl bg-muted" /> : (
              <ChecklistCalendar
                month={calendarMonth}
                records={records}
                mode={tab}
                selected={selectedRecord?.date?.slice(0, 10) || selectedRecord?.weekStart?.slice(0, 10)}
                onSelect={(key) => setSelected(records.find((record) => (record.date || record.weekStart || '').slice(0, 10) === key) || null)}
                onMonthChange={setCalendarMonth}
                showEmpty={(key) => key <= localDateKey() && (!employee?.startDate || key >= localDateKey(new Date(employee.startDate)))}
              />
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> کامل</span>
              <span className="flex items-center gap-1"><CircleAlert className="h-4 w-4 text-warning" /> ناقص</span>
              <span className="flex items-center gap-1"><X className="h-4 w-4 text-destructive" /> ثبت ناقص/بدون پاسخ</span>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent><DialogHeader><DialogTitle>جزئیات {employee ? `${employee.firstName} ${employee.lastName}` : 'چک‌لیست'}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-2">{Object.entries(selected.items || {}).map(([item, value]) => <div key={item} className="flex justify-between rounded-lg border p-2 text-sm"><span>{item}</span><Badge variant="outline">{value}</Badge></div>)}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
