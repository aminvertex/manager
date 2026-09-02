'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RoleCode } from '@amatis/types';
import { toJalaliDateTime, toPersianDigits } from '@/lib/date';

export default function EvaluationsPage() {
  const { hasRole } = useAuth();
  const isSupervisor = hasRole(RoleCode.SUPERVISOR) || hasRole(RoleCode.SUPER_ADMIN);

  const { data, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => api.get<{ data: Array<{ id: string; result: string; score100: number | null; comment: string | null; evaluatedAt: string; employee: { firstName: string; lastName: string } }> }>('/evaluations?limit=50'),
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
            <Card key={e.id}>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}