'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits, JALALI_MONTHS, toJalaliParts, j2g } from '@/lib/date';

interface JalaliMonthPickerProps {
  value: string; // YYYY-MM (gregorian)
  onChange: (val: string) => void;
  className?: string;
}

export function JalaliMonthPicker({ value, onChange, className = '' }: JalaliMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cur = value ? toJalaliParts(new Date(value + '-01')) : toJalaliParts(new Date());
  const [jy, setJy] = useState(cur.jy);
  const [jm, setJm] = useState(cur.jm);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectMonth = (m: number) => {
    const g = j2g(jy, m, 1);
    onChange(`${g.year}-${String(g.month).padStart(2, '0')}`);
    setJm(m);
    setOpen(false);
  };

  const display = value ? `${JALALI_MONTHS[cur.jm - 1]} ${toPersianDigits(cur.jy)}` : 'انتخاب ماه';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`h-10 rounded-md border border-input bg-background px-3 text-sm text-right w-full min-w-[130px] ${className}`}>
        {display}
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-50 rounded-lg border bg-card shadow-lg p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setJy(jy - 1)}><ChevronRight className="h-4 w-4" /></button>
            <span className="text-sm font-medium">{toPersianDigits(jy)}</span>
            <button type="button" onClick={() => setJy(jy + 1)}><ChevronLeft className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {JALALI_MONTHS.map((name, i) => (
              <button key={i} type="button"
                onClick={() => selectMonth(i + 1)}
                className={`rounded p-2 text-xs hover:bg-accent ${jm === i + 1 ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
