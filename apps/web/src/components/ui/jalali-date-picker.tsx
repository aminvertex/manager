'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits, JALALI_MONTHS, JALALI_WEEKDAYS, toJalaliParts, j2g, jalaliMonthGrid, makeJalaliKey } from '@/lib/date';

interface JalaliDatePickerProps {
  value: string; // YYYY-MM-DD (gregorian)
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disablePast?: boolean;
}

export function JalaliDatePicker({ value, onChange, className = '', placeholder = 'انتخاب تاریخ', disablePast }: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const todayParts = toJalaliParts(new Date());

  const parts = value ? toJalaliParts(new Date(value)) : toJalaliParts(new Date());
  const [jy, setJy] = useState(parts.jy);
  const [jm, setJm] = useState(parts.jm);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cells = jalaliMonthGrid(jy, jm);
  const valStr = value ? toJalaliParts(new Date(value)) : null;
  const display = valStr ? `${toPersianDigits(valStr.jd)} ${JALALI_MONTHS[valStr.jm - 1]} ${toPersianDigits(valStr.jy)}` : '';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`h-10 rounded-md border border-input bg-background px-3 text-sm text-right w-full ${className}`}>
        {display || placeholder}
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-50 rounded-lg border bg-card shadow-lg p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => { let nj=jm-1; let ny=jy; if(nj<1){nj=12;ny--} setJm(nj);setJy(ny); }}><ChevronRight className="h-4 w-4" /></button>
            <span className="text-sm font-medium">{JALALI_MONTHS[jm-1]} {toPersianDigits(jy)}</span>
            <button type="button" onClick={() => { let nj=jm+1; let ny=jy; if(nj>12){nj=1;ny++} setJm(nj);setJy(ny); }}><ChevronLeft className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
            {JALALI_WEEKDAYS.map(d => <div key={d} className="text-muted-foreground py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const greg = j2g(jy, jm, d);
              const key = `${greg.year}-${String(greg.month).padStart(2,'0')}-${String(greg.day).padStart(2,'0')}`;
              const isSelected = value && value === key;
              const isPast = disablePast && (jy < todayParts.jy || (jy === todayParts.jy && jm < todayParts.jm) || (jy === todayParts.jy && jm === todayParts.jm && d < todayParts.jd));
              return (
                <button key={i} type="button"
                  onClick={() => { if (!isPast) { onChange(key); setOpen(false); } }}
                  disabled={isPast}
                  className={`rounded p-1 text-xs hover:bg-accent ${isSelected ? 'bg-primary text-primary-foreground' : ''} ${isPast ? 'text-muted-foreground/40 cursor-not-allowed' : ''}`}
                >
                  {toPersianDigits(d)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}