export function toJalali(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  const gregorian = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const jy = (g: Date) => {
    const gd = g.getDate(), gm = g.getMonth() + 1, gy = g.getFullYear();
    let jy: number, jm: number, jd: number;
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    return { jy, jm, jd };
  };
  const j = jy(gregorian);
  const monthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  return `${j.jd} ${monthNames[j.jm - 1]} ${j.jy}`;
}

export function toJalaliDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return toJalali(date);
}

export function toJalaliDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const j = toJalali(d);
  return `${j} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function toPersianDigits(num: number | string): string {
  const map: Record<string, string> = {
    '0': '۰','1': '۱','2': '۲','3': '۳','4': '۴','5': '۵','6': '۶','7': '۷','8': '۸','9': '۹',
  };
  return String(num).replace(/[0-9]/g, (d) => map[d]);
}

const g2j = (gy: number, gm: number, gd: number) => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number, jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
};

export const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
export const JALALI_WEEKDAYS = ['ش','ی','د','س','چ','پ','ج'];

export function toJalaliParts(date: Date | string | null | undefined): { jy: number; jm: number; jd: number } {
  if (!date) return { jy: 0, jm: 0, jd: 0 };
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return { jy: 0, jm: 0, jd: 0 };
  return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaliMonthGrid(jy: number, jm: number): (number | null)[] {
  // first day of the jalali month -> gregorian date
  const gd = j2g(jy, jm, 1);
  const first = new Date(gd.year, gd.month - 1, gd.day);
  const startWeekday = (first.getDay() + 1) % 7; // shift so Saturday=0 (week starts Saturday in Iran)
  const daysInMonth = jalaliDaysInMonth(jy, jm);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function jalaliDaysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const current = j2g(jy, 12, 29);
  const next = j2g(jy + 1, 1, 1);
  return new Date(next.year, next.month - 1, next.day).getTime() -
    new Date(current.year, current.month - 1, current.day).getTime() > 24 * 60 * 60 * 1000 ? 30 : 29;
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function j2g(jy: number, jm: number, jd: number): { year: number; month: number; day: number } {
  let jy2 = jy + 1595;
  let days = -355668 + (365 * jy2) + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  let gdd = gd;
  for (let v = 0; v < 13 && gdd > sal_a[v]; v++) { gdd -= sal_a[v]; gm = v + 1; }
  return { year: gy, month: gm, day: gdd };
}

export function jalaliDateKey(jy: number, jm: number, jd: number): string {
  const g = j2g(jy, jm, jd);
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
}

export const makeJalaliKey = jalaliDateKey;

export function toJalaliMonthTitle(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}
