'use client';

import { ChevronLeft, ChevronRight, Check, CircleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JALALI_MONTHS, JALALI_WEEKDAYS, jalaliDateKey, jalaliMonthGrid, j2g, localDateKey, toJalaliParts, toPersianDigits } from '@/lib/date';

export type ChecklistRecord = { date?: string; weekStart?: string; completionRate: number; items: Record<string, string> };

export function ChecklistCalendar({ month, records, selected, onSelect, disabled, onMonthChange, mode = 'daily', showEmpty }: {
  month?: Date; records: ChecklistRecord[]; selected?: string; onSelect: (key: string) => void;
  disabled?: (key: string) => boolean; onMonthChange?: (date: Date) => void; mode?: 'daily' | 'weekly';
  showEmpty?: boolean | ((key: string) => boolean);
}) {
  const initial = toJalaliParts(month || new Date());
  const jy = initial.jy; const jm = initial.jm;
  const find = (key: string) => records.find((r) => (r.date || r.weekStart || '').slice(0, 10) === key);
  const shouldShowEmpty = (key: string) => typeof showEmpty === 'function' ? showEmpty(key) : !!showEmpty;
  const move = (delta: number) => {
    let nextMonth = jm + delta; let nextYear = jy;
    if (nextMonth < 1) { nextMonth = 12; nextYear--; }
    if (nextMonth > 12) { nextMonth = 1; nextYear++; }
    const greg = jalaliDateKey(nextYear, nextMonth, 1);
    onMonthChange?.(new Date(`${greg}T00:00:00`));
  };
  const grid = jalaliMonthGrid(jy, jm);
  const statusIcon = (record: ChecklistRecord | undefined) => {
    if (!record) return null;
    return record.completionRate >= 100
      ? <Check className="h-3.5 w-3.5 text-success" />
      : record.completionRate > 0
        ? <CircleAlert className="h-3.5 w-3.5 text-warning" />
        : <X className="h-3.5 w-3.5 text-destructive/70" />;
  };
  const statusClass = (record: ChecklistRecord | undefined) =>
    record && record.completionRate >= 100 ? 'border-success/40 bg-success/5' : record && record.completionRate > 0 ? 'border-warning/40 bg-warning/5' : record ? 'border-destructive/30 bg-destructive/5' : '';
  const weeklyCells = Array.from({ length: Math.ceil(grid.length / 7) }, (_, weekIndex) => {
    const days = grid.slice(weekIndex * 7, weekIndex * 7 + 7);
    const firstIndex = days.findIndex((day) => day !== null);
    const firstDay = firstIndex >= 0 ? days[firstIndex] : null;
    if (firstDay === null) return { days, key: `week-${weekIndex}` };
    const gregorian = j2g(jy, jm, firstDay);
    const weekStart = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
    weekStart.setDate(weekStart.getDate() - firstIndex);
    return { days, key: localDateKey(weekStart) };
  });
  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(1)} className="rounded-lg p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        <strong>{JALALI_MONTHS[jm - 1]} {toPersianDigits(jy)}</strong>
        <button type="button" onClick={() => move(-1)} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {JALALI_WEEKDAYS.map((day) => <div key={day} className="text-center text-xs text-muted-foreground">{day}</div>)}
        {mode === 'weekly' ? weeklyCells.map(({ days, key }) => {
          const record = find(key);
          const hasStatus = !!record || shouldShowEmpty(key);
          const isDisabled = disabled?.(key) ?? false;
          return <button key={key} type="button" disabled={isDisabled} onClick={() => onSelect(key)} className={cn('col-span-7 flex min-h-16 items-center justify-between rounded-xl border px-4 transition-all hover:-translate-y-0.5 hover:shadow-md', statusClass(record), selected === key && 'ring-2 ring-primary', isDisabled && 'cursor-not-allowed opacity-40')}>
            <div className="flex items-center gap-2">{days.map((day, index) => day === null ? <span key={index} className="w-7" /> : <span key={day} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">{toPersianDigits(day)}</span>)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{statusIcon(record) || (hasStatus ? <X className="h-3.5 w-3.5 text-destructive/70" /> : null)}<span>{record ? `${toPersianDigits(record.completionRate)}٪` : hasStatus ? 'ثبت نشده' : ''}</span></div>
          </button>;
        }) : grid.map((day, index) => day === null ? <div key={`blank-${index}`} /> : (() => {
          const key = jalaliDateKey(jy, jm, day);
          const record = find(key); const state = record ? (record.completionRate >= 100 ? 'complete' : record.completionRate > 0 ? 'partial' : 'empty') : 'empty';
          const hasStatus = !!record || shouldShowEmpty(key);
          const isDisabled = disabled?.(key) ?? false;
          return <button key={key} type="button" disabled={isDisabled} onClick={() => onSelect(key)} className={cn('relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm transition-all hover:-translate-y-0.5 hover:shadow-md', selected === key && 'ring-2 ring-primary', isDisabled && 'cursor-not-allowed opacity-40')}><span>{toPersianDigits(day)}</span>{state === 'complete' ? <Check className="h-3.5 w-3.5 text-success" /> : state === 'partial' ? <CircleAlert className="h-3.5 w-3.5 text-warning" /> : hasStatus ? <X className="h-3.5 w-3.5 text-destructive/70" /> : null}</button>;
        })())}
      </div>
    </div>
  );
}
