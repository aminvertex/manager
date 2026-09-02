import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianNumber(num: number): string {
  return num.toLocaleString('fa-IR');
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

export function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4041/api/v1';
  const apiBase = base.replace('/api/v1', '');
  return `${apiBase}${url}`;
}

export async function downloadFile(endpoint: string, fallbackName: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4041/api/v1';
  const res = await fetch(`${base}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('ط®ط·ط§ ط¯ط± ط¯ط±غŒط§ظپطھ ظپط§غŒظ„');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}


