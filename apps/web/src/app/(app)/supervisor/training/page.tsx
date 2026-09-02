'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Loader2, Plus, GraduationCap, ClipboardList, Trash2 } from 'lucide-react';
import { toJalaliDate, toPersianDigits } from '@/lib/date';
import { toast } from '@/hooks/use-toast';

interface TrainingItem {
  id: string; title: string; type: string; status: string; instructor?: string;
  durationHours?: number; examScore?: number; trainingDate?: string;
  employee: { id: string; firstName: string; lastName: string };
}

const TYPE_LABELS: Record<string, string> = {
  INTERNAL: 'داخلی', ONLINE: 'آنلاین', IN_PERSON: 'حضوری', SELF_STUDY: 'خودآموز', SUPERVISION: 'تحت نظارت', CASE_STUDY: 'مطالعه موردی',
};
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'برنامه‌ریزی شده', IN_PROGRESS: 'در حال اجرا', COMPLETED: 'تکمیل شده', CANCELLED: 'لغو شده',
};

export default function SupervisorTrainingPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: trainings, isLoading } = useQuery({
    queryKey: ['sup-trainings'],
    queryFn: () => api.get<{ data: TrainingItem[] }>('/training?limit=100'),
  });
  const trainingsList = trainings?.data || [];

  const { data: team } = useQuery({
    queryKey: ['sup-train-team'],
    queryFn: () => api.get<{ data: any[] }>('/employees?limit=100'),
  });

  const [form, setForm] = useState({ employeeId: '', title: '', type: 'INTERNAL', instructor: '', durationHours: '' });

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTraining, setQuizTraining] = useState<TrainingItem | null>(null);
  const [quizForm, setQuizForm] = useState<{ title: string; passScore: string; timeMinutes: string; questions: Array<{ text: string; correct: string; options: string[] }> }>({
    title: '', passScore: '70', timeMinutes: '15', questions: [{ text: '', correct: '0', options: ['', '', '', ''] }],
  });

  const openQuiz = (t: TrainingItem) => {
    setQuizTraining(t);
    setQuizForm({ title: `آزمون ${t.title}`, passScore: '70', timeMinutes: '15', questions: [{ text: '', correct: '0', options: ['', '', '', ''] }] });
    setQuizOpen(true);
  };

  const saveQuiz = useMutation({
    mutationFn: () => api.post('/quiz/create', {
      trainingId: quizTraining?.id,
      title: quizForm.title,
      passScore: Number(quizForm.passScore),
      timeMinutes: Number(quizForm.timeMinutes),
      questions: quizForm.questions.map((q) => ({ text: q.text, options: q.options, correct: Number(q.correct), score: 1 })),
    }),
    onSuccess: () => { setQuizOpen(false); toast({ title: 'آزمون ایجاد شد' }); qc.invalidateQueries({ queryKey: ['sup-trainings'] }); },
  });

  const saveTraining = useMutation({
    mutationFn: (body: any) => api.post('/training', body),
    onSuccess: () => { setOpen(false); setForm({ employeeId: '', title: '', type: 'INTERNAL', instructor: '', durationHours: '' }); qc.invalidateQueries({ queryKey: ['sup-trainings'] }); },
  });

  const items = trainingsList.filter((t) => team?.data?.some((e: any) => e.id === t.employee.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تعیین آموزش</h1>
          <p className="text-muted-foreground">اختصاص دوره آموزشی به اعضای تیم</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" /> آموزش جدید</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تعیین آموزش جدید</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>کارمند</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <option value="">انتخاب...</option>
                  {(team?.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </Select>
              </div>
              <div><Label>عنوان آموزش</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: آموزش فرم نویسی" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>نوع</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div><Label>مدت (ساعت)</Label><Input type="number" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} /></div>
              </div>
              <div><Label>مدرس</Label><Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.employeeId || !form.title} onClick={() => saveTraining.mutate({ ...form, durationHours: form.durationHours ? Number(form.durationHours) : undefined })}>
                ثبت آموزش
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">آموزشی ثبت نشده است</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.employee.firstName} {t.employee.lastName} • {TYPE_LABELS[t.type] || t.type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'COMPLETED' ? 'bg-success/15 text-success' : t.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
                {(t.instructor || t.durationHours) && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t.instructor && <>مدرس: {t.instructor}</>}
                    {t.instructor && t.durationHours ? ' • ' : ''}
                    {t.durationHours ? `${toPersianDigits(t.durationHours)} ساعت` : ''}
                  </p>
                )}
                {t.trainingDate && <p className="text-xs text-muted-foreground mt-1">تاریخ: {toJalaliDate(t.trainingDate)}</p>}
                {t.examScore != null && <p className="text-xs mt-1">نمره آزمون: <span className="font-medium">{toPersianDigits(t.examScore)}</span></p>}
                <div className="flex justify-end mt-3">
                  <Button size="sm" variant="outline" onClick={() => openQuiz(t)}><ClipboardList className="h-4 w-4 ml-1" /> آزمون</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ایجاد آزمون — {quizTraining?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>عنوان آزمون</Label><Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} /></div>
              <div><Label>نمره قبولی (٪)</Label><Input type="number" value={quizForm.passScore} onChange={(e) => setQuizForm({ ...quizForm, passScore: e.target.value })} /></div>
              <div><Label>زمان (دقیقه)</Label><Input type="number" value={quizForm.timeMinutes} onChange={(e) => setQuizForm({ ...quizForm, timeMinutes: e.target.value })} /></div>
            </div>

            {quizForm.questions.map((q, qi) => (
              <div key={qi} className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">سوال {toPersianDigits(qi + 1)}</Label>
                  <Input value={q.text} onChange={(e) => { const qs = [...quizForm.questions]; qs[qi] = { ...qs[qi], text: e.target.value }; setQuizForm({ ...quizForm, questions: qs }); }} placeholder="متن سوال..." />
                  <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => setQuizForm({ ...quizForm, questions: quizForm.questions.filter((_, x) => x !== qi) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={Number(q.correct) === oi}
                      onChange={() => { const qs = [...quizForm.questions]; qs[qi] = { ...qs[qi], correct: String(oi) }; setQuizForm({ ...quizForm, questions: qs }); }}
                    />
                    <Input value={opt} onChange={(e) => { const qs = [...quizForm.questions]; const opts = [...qs[qi].options]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; setQuizForm({ ...quizForm, questions: qs }); }} placeholder={`گزینه ${toPersianDigits(oi + 1)}`} />
                  </div>
                ))}
              </div>
            ))}

            <Button variant="outline" onClick={() => setQuizForm({ ...quizForm, questions: [...quizForm.questions, { text: '', correct: '0', options: ['', '', '', ''] }] })}>
              <Plus className="h-4 w-4 ml-1" /> افزودن سوال
            </Button>
            <Button className="w-full" disabled={saveQuiz.isPending || !quizForm.title || quizForm.questions.some((q) => !q.text)} onClick={() => saveQuiz.mutate()}>
              {saveQuiz.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              ثبت آزمون
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}