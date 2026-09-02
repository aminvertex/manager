'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, BellOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { toJalaliDateTime } from '@/lib/date';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ data: Notification[]; unreadCount: number }>('/notifications?limit=100'),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); toast({ title: 'همه اعلان‌ها خوانده شد' }); },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); },
  });

  const typeStyles: Record<string, string> = {
    TASK_ASSIGNED: 'bg-blue-500/15 text-blue-600',
    TASK_SUBMITTED: 'bg-violet-500/15 text-violet-600',
    NEED_REVISION: 'bg-warning/15 text-warning',
    TASK_APPROVED: 'bg-success/15 text-success',
    TASK_REJECTED: 'bg-destructive/15 text-destructive',
    EVALUATION_APPROVED: 'bg-success/15 text-success',
    EVALUATION_NEED_REVISION: 'bg-warning/15 text-warning',
    EVALUATION_REJECTED: 'bg-destructive/15 text-destructive',
    DEADLINE_REMINDER: 'bg-warning/15 text-warning',
    TASK_DELAYED: 'bg-destructive/15 text-destructive',
    CHECKLIST_REMINDER: 'bg-muted',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">اعلان‌ها</h1>
          <p className="text-muted-foreground text-sm">{data?.unreadCount ? `${data.unreadCount.toLocaleString('fa-IR')} اعلان خوانده‌نشده` : 'همه اعلان‌ها خوانده شده‌اند'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={!data?.unreadCount}>
          <CheckCheck className="h-4 w-4 ml-2" />همه را خوانده کن
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !data?.data?.length ? (
        <Card className="p-10 text-center">
          <BellOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">اعلانی وجود ندارد</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.data.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-opacity hover:opacity-80 ${!n.isRead ? 'border-primary/30 bg-primary/[0.03]' : ''}`}
              onClick={() => !n.isRead && markOne.mutate(n.id)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeStyles[n.type] || 'bg-muted'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.isRead && <Badge className="bg-primary">جدید</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{toJalaliDateTime(n.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
