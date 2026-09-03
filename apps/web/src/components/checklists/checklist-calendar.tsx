'use client';

import { Check, CircleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChecklistRecord = { date?: string; weekStart?: string; completionRate: number; items: Record<string, string> };

function status(record?: ChecklistRecord) {
  if (!record) return 'empty';
  return record.completionRate >= 100 ? 'complete' : record.completionRate > 0 ? 'partial' : 'empty';
}

export function ChecklistCalendar({
  month,
  records,
  selected,
  onSelect,
  disabled,
}: {
  month: Date;
  records: ChecklistRecord[];
  selected?: string;
  onSelect: (key: string) => void;
  disabled?: (key: string) => boolean;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (new Date(year, monthIndex, 1).getDay() + 1) % 7;
  const find = (day: number) => {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find((r) => (r.date || r.weekStart || '').slice(0, 10) === key);
  };
  return (
    <div className="grid grid-cols-7 gap-2">
      {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((day) => <div key={day} className="text-center text-xs text-muted-foreground">{day}</div>)}
      {Array.from({ length: offset }).map((_, i) => <div key={`blank-${i}`} />)}
      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = find(day);
        const state = status(record);
        const isDisabled = disabled?.(key) ?? false;
        return (
          <button key={key} type="button" disabled={isDisabled} onClick={() => onSelect(key)}
            className={cn('relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm transition-all hover:-translate-y-0.5 hover:shadow-md', selected === key && 'ring-2 ring-primary', isDisabled && 'cursor-not-allowed opacity-40')}>
            <span>{day}</span>
            {state === 'complete' && <Check className="h-3.5 w-3.5 text-success" />}
            {state === 'partial' && <CircleAlert className="h-3.5 w-3.5 text-warning" />}
            {state === 'empty' && <X className="h-3.5 w-3.5 text-destructive/70" />}
          </button>
        );
      })}
    </div>
  );
}
