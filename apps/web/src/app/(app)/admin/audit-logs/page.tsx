'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield } from 'lucide-react';
import { toJalaliDateTime, toPersianDigits } from '@/lib/date';

interface AuditItem {
  id: string; action: string; entityType?: string; entityId?: string;
  description?: string; ip?: string; createdAt: string;
  user?: { firstName?: string; lastName?: string; mobile?: string };
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'ورود', LOGOUT: 'خروج', CREATE: 'ایجاد', UPDATE: 'به‌روزرسانی', DELETE: 'حذف', APPROVE: 'تأیید', REJECT: 'رد', DOWNLOAD: 'دانلود',
};

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<{ success: boolean; data: AuditItem[]; meta: { total: number } }>('/audit-logs?limit=100'),
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">گزارش‌های حسابرسی</h1>
        <p className="text-muted-foreground">{toPersianDigits(data?.meta?.total || 0)} رویداد ثبت شده</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">رویدادی ثبت نشده است</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                    {log.entityType && <Badge variant="secondary" className="text-[10px]">{log.entityType}</Badge>}
                  </div>
                  {log.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{log.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : log.user?.mobile || 'سیستم'}
                    {log.ip ? ` • ${log.ip}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{toJalaliDateTime(log.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}