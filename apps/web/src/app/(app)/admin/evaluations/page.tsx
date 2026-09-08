'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RoleCode } from '@amatis/types';
import { toJalaliDateTime, toPersianDigits } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EvaluationsPage() {
  const { hasRole } = useAuth();
  const isSupervisor = hasRole(RoleCode.SUPERVISOR) || hasRole(RoleCode.SUPER_ADMIN);

  const [selected, setSelected] = useState<any>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => api.get<{ data: Array<{ id: string; result: string; score100: number | null; comment: string | null; evaluatedAt: string; employee: { firstName: string; lastName: string }; task?: { taskTemplate?: { name: string } | null; project?: { name: string } | null }; scores?: Record<string, number> }> }>('/evaluations?limit=50'),
    enabled: isSupervisor,
  });

  const resultLabels: Record<string, string> = {
    APPROVED: 'تأیید شده', APPROVED_WITH_COMMENT: 'تأیید با نظر', NEED_REVISION: 'نیازمند اصلاح', REJECTED: 'رد شده', PENDING: 'در انتظار',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ارزیابی‌ها</h1>
        <p className="text-muted-foreground text-sm">نظارت بر کیفیت خروجی کارشناسان</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !data?.data?.length ? (
        <Card className="p-10 text-center">
          <Award className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">ارزیابی‌ای ثبت نشده است</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.data.map((e) => (
            <Card key={e.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{e.employee.firstName} {e.employee.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{toJalaliDateTime(e.evaluatedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={e.score100 != null && e.score100 >= 80 ? 'bg-success/15 text-success' : e.score100 != null && e.score100 >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                    {toPersianDigits(e.score100 ?? 0)}
                  </Badge>
                  <Badge variant="outline">{resultLabels[e.result] || e.result}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(e)}><Eye className="h-4 w-4 ml-1" />مشاهده جزئیات</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>جزئیات ارزیابی</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="font-semibold">{selected.task?.taskTemplate?.name || 'تسک'}</p>
                <p className="text-muted-foreground">{selected.task?.project?.name || 'بدون پروژه'}</p>
              </div>
              <p>کارشناس: {selected.employee.firstName} {selected.employee.lastName}</p>
              <p>امتیاز نهایی: <strong>{toPersianDigits(selected.score100 ?? 0)} از ۱۰۰</strong></p>
              {selected.scores && <div className="grid grid-cols-2 gap-2">{Object.entries(selected.scores).map(([key, value]) => <div key={key} className="rounded border p-2">{key}: {String(value)}</div>)}</div>}
              {selected.comment && <p className="rounded border p-3">{selected.comment}</p>}
              <p className="text-xs text-muted-foreground">{toJalaliDateTime(selected.evaluatedAt)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}