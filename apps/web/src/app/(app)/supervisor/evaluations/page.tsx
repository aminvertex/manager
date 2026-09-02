'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Loader2, Star, Plus } from 'lucide-react';
import { toJalaliDate, toPersianDigits } from '@/lib/date';

interface Employee {
  id: string; firstName: string; lastName: string;
}
interface EvalItem {
  id: string; employeeId: string; period: string; score: number;
  strengths?: string; improvementAreas?: string; correctiveActions?: string;
  employee?: { firstName: string; lastName: string };
  evaluatedAt: string;
}

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export default function SupervisorEvaluationsPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: evals, isLoading } = useQuery({
    queryKey: ['sup-evals', period],
    queryFn: () => api.get<EvalItem[]>(`/performance-evaluations/supervisor?period=${period}`),
  });

  const { data: team } = useQuery({
    queryKey: ['sup-eval-team'],
    queryFn: () => api.get<{ data: Employee[] }>('/employees?limit=100'),
  });

  const [form, setForm] = useState({
    employeeId: '', period, score: '', strengths: '', improvementAreas: '', correctiveActions: '', notes: '',
  });

  const saveEval = useMutation({
    mutationFn: (body: any) => api.post('/performance-evaluations', body),
    onSuccess: () => { setOpen(false); qc.invalidateQueries({ queryKey: ['sup-evals'] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ارزیابی عملکرد</h1>
          <p className="text-muted-foreground">ثبت نمره ارزیابی اعضای تیم</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" /> ارزیابی جدید</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>ثبت ارزیابی جدید</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>کارمند</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <option value="">انتخاب...</option>
                  {(team?.data || []).map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>دوره (YYYY-MM)</Label>
                  <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="1404-01" />
                </div>
                <div>
                  <Label>نمره (0-100)</Label>
                  <Input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                </div>
              </div>
              <div><Label>نقاط قوت</Label><Textarea value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></div>
              <div><Label>نقاط قابل بهبود</Label><Textarea value={form.improvementAreas} onChange={(e) => setForm({ ...form, improvementAreas: e.target.value })} /></div>
              <div><Label>اقدامات اصلاحی</Label><Textarea value={form.correctiveActions} onChange={(e) => setForm({ ...form, correctiveActions: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.employeeId || !form.score} onClick={() => saveEval.mutate({ ...form, period: form.period || period, score: Number(form.score) })}>
                ثبت ارزیابی
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="دوره (YYYY-MM)" className="max-w-[160px]" />
        <Button variant="outline" onClick={() => setPeriod(period)}>جستجو</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (evals || []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">ارزیابی‌ای ثبت نشده است</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {(evals || []).map((ev) => (
            <Card key={ev.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Star className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{ev.employee?.firstName} {ev.employee?.lastName}</p>
                      <p className="text-xs text-muted-foreground">دوره {ev.period} • {toJalaliDate(ev.evaluatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${ev.score >= 75 ? 'text-success' : ev.score >= 50 ? 'text-warning' : 'text-destructive'}`}>
                      {toPersianDigits(Math.round(ev.score))}
                    </p>
                    <p className="text-xs text-muted-foreground">از ۱۰۰</p>
                  </div>
                </div>
                {ev.strengths && <p className="mt-3 text-sm"><span className="text-success font-medium">نقاط قوت: </span>{ev.strengths}</p>}
                {ev.improvementAreas && <p className="mt-1 text-sm"><span className="text-warning font-medium">قابل بهبود: </span>{ev.improvementAreas}</p>}
                {ev.correctiveActions && <p className="mt-1 text-sm"><span className="text-destructive font-medium">اقدامات اصلاحی: </span>{ev.correctiveActions}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}