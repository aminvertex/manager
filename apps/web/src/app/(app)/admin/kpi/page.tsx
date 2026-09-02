'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Target, Save } from 'lucide-react';
import { useState } from 'react';

interface KPIWeights {
  onTimeDelivery?: number;
  scientificQuality?: number;
  accuracy?: number;
  documentation?: number;
  productivity?: number;
  processCompliance?: number;
  learning?: number;
  teamwork?: number;
  responsibility?: number;
  [key: string]: number | undefined;
}

const WEIGHT_LABELS: Record<string, string> = {
  onTimeDelivery: 'تحویل به موقع',
  scientificQuality: 'کیفیت علمی',
  accuracy: 'دقت',
  documentation: 'مستندسازی',
  productivity: 'بهره‌وری',
  processCompliance: 'انطباق فرآیندی',
  learning: 'یادگیری',
  teamwork: 'کار تیمی',
  responsibility: 'مسئولیت‌پذیری',
};

export default function KpiPage() {
  const qc = useQueryClient();
  const { data: weights, isLoading } = useQuery({
    queryKey: ['kpi-weights'],
    queryFn: () => api.get<KPIWeights>('/kpi/weights'),
  });

  const [form, setForm] = useState<KPIWeights>({});

  const saveWeights = useMutation({
    mutationFn: (body: KPIWeights) => api.post('/kpi/weights', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-weights'] }),
  });

  const recalcAll = useMutation({
    mutationFn: () => api.post('/kpi/recalculate-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-weights'] }),
  });

  const current = Object.keys(form).length > 0 ? form : weights || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPI و فرمول‌ها</h1>
          <p className="text-muted-foreground">تنظیم وزن شاخص‌های کلیدی عملکرد</p>
        </div>
        <Button variant="outline" onClick={() => recalcAll.mutate()}>
          <Target className="h-4 w-4 ml-2" /> محاسبه مجدد همه
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader><CardTitle>وزن شاخص‌ها</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(WEIGHT_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="min-w-[120px]">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={current[key] ?? 0}
                  onChange={(e) => setForm({ ...current, [key]: Number(e.target.value) })}
                  className="max-w-[120px]"
                />
                <span className="text-xs text-muted-foreground">٪</span>
              </div>
            ))}
            <Button className="mt-4" onClick={() => saveWeights.mutate(current)}>
              <Save className="h-4 w-4 ml-2" /> ذخیره وزن‌ها
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}