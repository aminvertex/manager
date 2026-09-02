'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, TrendingUp, CheckCircle2, Clock, RefreshCcw, Target, Award, Star } from 'lucide-react';
import { toPersianDigits, toJalali, toJalaliDate } from '@/lib/date';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const KPI_LABELS: Record<string, string> = {
  onTimeDelivery: 'تحویل به موقع', scientificQuality: 'کیفیت علمی', accuracy: 'دقت',
  documentation: 'مستندسازی', productivity: 'بهره‌وری', processCompliance: 'انطباق فرآیندی',
  learning: 'یادگیری', teamwork: 'کار تیمی', responsibility: 'مسئولیت‌پذیری',
};

export default function MyPerformancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const empId = user?.employeeProfile?.id;
  const [showSelf, setShowSelf] = useState(false);
  const [selfForm, setSelfForm] = useState({ score: '', strengths: '', improvement: '' });

  const { data: kpis } = useQuery({
    queryKey: ['my-kpis'],
    queryFn: () => api.get<{ data: Array<{ period: string; finalScore: number; classification: string; scores: Record<string, number>; penalty: number }> }>('/kpi/recalculate/' + empId).catch(() => null),
    enabled: !!empId,
  });

  const { data: trend } = useQuery({
    queryKey: ['kpi-trend', empId],
    queryFn: () => api.get<Array<{ period: string; kpi: number | null; supervisorScore: number | null; selfScore: number | null; teamAverage: number | null }>>(`/kpi/trend/${empId}?months=6`),
    enabled: !!empId,
  });

  const { data: tasks } = useQuery({
    queryKey: ['my-tasks-perf'],
    queryFn: () => api.get<{ data: Array<{ status: string; qualityScore: number | null; revisionCount: number }> }>('/tasks?limit=200'),
  });

  const { data: evals } = useQuery({
    queryKey: ['my-evals', empId],
    queryFn: () => api.get<Array<{ id: string; period: string; score: number | null; selfScore: number | null; strengths?: string; selfStrengths?: string; improvementAreas?: string; correctiveActions?: string; notes?: string; evaluatedAt: string; supervisor?: { firstName: string; lastName: string } | null }>>(`/performance-evaluations/employee/${empId}`),
    enabled: !!empId,
  });

  const { data: dataFlow } = useQuery({
    queryKey: ['my-dataflow', empId],
    queryFn: () => api.get<any>(`/dashboard/evaluation-flow/${empId}`).catch(() => null),
    enabled: !!empId,
  });

  const [selectedEval, setSelectedEval] = useState<any>(null);

  const submitSelf = useMutation({
    mutationFn: () => api.post('/performance-evaluations/self', {
      period: new Date().toISOString().slice(0, 7),
      score: Number(selfForm.score),
      strengths: selfForm.strengths,
      improvement: selfForm.improvement,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-evals'] }); qc.invalidateQueries({ queryKey: ['kpi-trend'] }); setShowSelf(false); toast({ title: 'خودارزیابی ثبت شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const completed = (tasks?.data || []).filter((t) => t.status === 'APPROVED').length;
  const total = (tasks?.data || []).length;
  const revisions = (tasks?.data || []).reduce((s, t) => s + t.revisionCount, 0);
  const qualityValues = (tasks?.data || []).map((t) => t.qualityScore).filter((q): q is number => q != null);
  const avgQuality = qualityValues.length ? Math.round(qualityValues.reduce((s, q) => s + q, 0) / qualityValues.length) : null;
  const latestEval = (evals || [])[0];
  const score = latestEval?.score ?? null;
  const selfScore = latestEval?.selfScore ?? null;

  const trendData = (trend || []).map((t) => ({
    ...t,
    label: toJalali(new Date(t.period + '-01')),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">عملکرد من</h1>
          <p className="text-muted-foreground text-sm">نمای کلی عملکرد فردی</p>
        </div>
        <Button variant="outline" onClick={() => setShowSelf(true)}><Star className="h-4 w-4 ml-2" /> خودارزیابی</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">نرخ تکمیل</CardTitle><CheckCircle2 className="h-5 w-5 text-success" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total ? `${toPersianDigits(Math.round((completed / total) * 100))}٪` : '—'}</div></CardContent>
        </Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">میانگین کیفیت</CardTitle><Award className="h-5 w-5 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgQuality != null ? toPersianDigits(avgQuality) : '—'}</div></CardContent>
        </Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">تعداد اصلاحات</CardTitle><RefreshCcw className="h-5 w-5 text-warning" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{toPersianDigits(revisions)}</div></CardContent>
        </Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">ارزیابی سرپرست</CardTitle><TrendingUp className="h-5 w-5 text-success" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{score != null ? toPersianDigits(score) : '—'}</div>
            {score != null && (
              <Badge className={`mt-1 ${score >= 80 ? 'bg-success/15 text-success' : score >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}`}>
                {score >= 80 ? 'عملکرد بالا' : score >= 60 ? 'نیازمند توسعه' : 'نیازمند مداخله'}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {dataFlow?.flow && (
        <Card>
          <CardHeader><CardTitle className="text-base">جریان ارزیابی — دوره {dataFlow.period}</CardTitle><CardDescription>چگونگی شکل‌گیری ارزیابی از داده‌های خام</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { title: 'تسک‌ها', val: `${dataFlow.flow.taskData.completed} از ${dataFlow.flow.taskData.totalTasks} تکمیل` },
                { title: 'چک‌لیست', val: dataFlow.flow.checklist.completionRate != null ? `${Math.round(dataFlow.flow.checklist.completionRate)}٪` : '—' },
                { title: 'KPI', val: dataFlow.flow.performanceMetrics.kpiScore != null ? `${Math.round(dataFlow.flow.performanceMetrics.kpiScore)}` : '—' },
                { title: 'ارزیابی', val: dataFlow.flow.supervisorEvaluation.avgScore != null ? `${Math.round(dataFlow.flow.supervisorEvaluation.avgScore)}/۱۰۰` : '—' },
              ].map((s, i) => (
                <div key={s.title} className="flex items-center gap-2">
                  <div className="rounded-lg border bg-muted/30 p-3 min-w-[130px]"><p className="font-medium text-xs text-muted-foreground mb-1">{s.title}</p><p className="font-bold text-sm">{s.val}</p></div>
                  {i < 3 && <span className="text-muted-foreground text-xs">←</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">روند عملکرد (۶ ماه)</CardTitle><CardDescription>مقایسه امتیاز سرپرست، خودارزیابی و KPI</CardDescription></CardHeader>
        <CardContent className="h-80">
          {trendData.length === 0 ? (
            <p className="text-center text-muted-foreground pt-24">داده‌ای برای نمودار روند وجود ندارد</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="kpi" stroke="#22c55e" strokeWidth={2} name="KPI" connectNulls />
                <Line type="monotone" dataKey="supervisorScore" stroke="#3b82f6" strokeWidth={2} name="سرپرست" connectNulls />
                <Line type="monotone" dataKey="selfScore" stroke="#a855f7" strokeWidth={2} name="خودارزیابی" connectNulls />
                <Line type="monotone" dataKey="teamAverage" stroke="#f59e0b" strokeWidth={2} name="میانگین تیم" connectNulls strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => latestEval && setSelectedEval(latestEval)}>
          <CardHeader><CardTitle className="text-base">آخرین ارزیابی سرپرست</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {latestEval ? (
              <>
                <div className="flex items-center gap-3">
                  <Badge className={latestEval.score != null && latestEval.score >= 80 ? 'bg-success/15 text-success' : latestEval.score != null && latestEval.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                    نمره: {latestEval.score != null ? toPersianDigits(latestEval.score) : '—'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">دوره {latestEval.period}</span>
                  {latestEval.supervisor && <span className="text-xs text-muted-foreground">ارزیاب: {latestEval.supervisor.firstName} {latestEval.supervisor.lastName}</span>}
                </div>
                {latestEval.strengths && <p className="text-sm mt-2"><span className="text-success font-medium">نقاط قوت: </span>{latestEval.strengths}</p>}
                <p className="text-xs text-muted-foreground mt-1">برای مشاهده جزئیات کلیک کنید</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">ارزیابی سرپرست ثبت نشده است</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">آخرین خودارزیابی من</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {latestEval?.selfScore != null ? (
              <>
                <div className="flex items-center gap-3">
                  <Badge className="bg-violet-500/15 text-violet-600">نمره خود: {toPersianDigits(latestEval.selfScore)}</Badge>
                  <span className="text-xs text-muted-foreground">دوره {latestEval.period}</span>
                </div>
                {latestEval.selfStrengths && <p className="text-sm mt-2">{latestEval.selfStrengths}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">هنوز خودارزیابی ثبت نکرده‌اید</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">جزئیات KPI</CardTitle><CardDescription>بر اساس وزن‌های تعریف‌شده سیستم</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {(kpis?.data || []).slice(0, 3).map((k) => (
            <div key={k.period} className="rounded-lg border p-4">
              <div className="flex justify-between mb-3">
                <span className="font-medium">ماه {toJalali(new Date(k.period + '-01'))}</span>
                <Badge>{toPersianDigits(k.finalScore)} — {k.classification}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries(k.scores).map(([key, val]) => (
                  <div key={key} className="rounded bg-muted/50 p-2">
                    <div className="text-xs text-muted-foreground">{KPI_LABELS[key] || key}</div>
                    <div className="font-medium">{toPersianDigits(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(kpis?.data || []).length === 0 && <p className="text-sm text-muted-foreground">KPI هنوز محاسبه نشده است</p>}
        </CardContent>
      </Card>

      <Dialog open={showSelf} onOpenChange={setShowSelf}>
        <DialogContent>
          <DialogHeader><DialogTitle>خودارزیابی ماه جاری</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>امتیاز خود (۰-۱۰۰) *</Label><Input type="number" min={0} max={100} value={selfForm.score} onChange={(e) => setSelfForm({ ...selfForm, score: e.target.value })} /></div>
            <div><Label>نقاط قوت</Label><Textarea value={selfForm.strengths} onChange={(e) => setSelfForm({ ...selfForm, strengths: e.target.value })} /></div>
            <div><Label>زمینه‌های بهبود</Label><Textarea value={selfForm.improvement} onChange={(e) => setSelfForm({ ...selfForm, improvement: e.target.value })} /></div>
            <Button className="w-full" disabled={!selfForm.score || submitSelf.isPending} onClick={() => submitSelf.mutate()}>
              {submitSelf.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              ثبت خودارزیابی
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEval} onOpenChange={(o) => !o && setSelectedEval(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>جزئیات ارزیابی — دوره {selectedEval?.period}</DialogTitle></DialogHeader>
          {selectedEval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">امتیاز نهایی</span><p className="font-bold text-lg mt-0.5">{selectedEval.score != null ? `${toPersianDigits(Math.round(selectedEval.score))} / ۱۰۰` : '—'}</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">خودارزیابی</span><p className="font-bold text-lg mt-0.5">{selectedEval.selfScore != null ? `${toPersianDigits(Math.round(selectedEval.selfScore))} / ۱۰۰` : '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">ارزیاب</span><p className="font-medium mt-0.5">{selectedEval.supervisor ? `${selectedEval.supervisor.firstName} ${selectedEval.supervisor.lastName}` : '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">تاریخ</span><p className="font-medium mt-0.5">{toJalaliDate(selectedEval.evaluatedAt)}</p></div>
              </div>
              {selectedEval.strengths && <div className="rounded-lg border p-3"><span className="text-xs text-success font-medium">نقاط قوت: </span><p className="text-sm mt-1">{selectedEval.strengths}</p></div>}
              {selectedEval.improvementAreas && <div className="rounded-lg border p-3"><span className="text-xs text-warning font-medium">زمینه‌های بهبود: </span><p className="text-sm mt-1">{selectedEval.improvementAreas}</p></div>}
              {selectedEval.correctiveActions && <div className="rounded-lg border p-3"><span className="text-xs text-destructive font-medium">اقدامات اصلاحی: </span><p className="text-sm mt-1">{selectedEval.correctiveActions}</p></div>}
              {selectedEval.notes && <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground font-medium">توضیحات: </span><p className="text-sm mt-1">{selectedEval.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}