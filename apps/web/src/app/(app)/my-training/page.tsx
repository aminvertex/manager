'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, GraduationCap, CheckCircle2, Clock, Award, FileDown, ClipboardList } from 'lucide-react';
import { toJalaliDate, toPersianDigits } from '@/lib/date';
import { downloadFile } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface TrainingItem {
  id: string; title: string; type: string; status: string; instructor: string | null;
  examScore: number | null; supervisorScore: number | null; trainingDate: string | null;
  quiz?: { id: string; passScore: number; timeMinutes: number | null; _count?: { questions: number } } | null;
}

interface QuizQuestion { id: string; text: string; options: string[]; score: number }

export default function MyTrainingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [quizTraining, setQuizTraining] = useState<TrainingItem | null>(null);
  const [quiz, setQuiz] = useState<{ title: string; passScore: number; timeMinutes?: number | null; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-training'],
    queryFn: () => api.get<{ data: TrainingItem[] }>('/training?limit=100'),
  });

  const typeLabels: Record<string, string> = {
    INTERNAL: 'داخلی', ONLINE: 'آنلاین', IN_PERSON: 'حضوری', SELF_STUDY: 'خودآموز', SUPERVISION: 'سوپرویژن', CASE_STUDY: 'مطالعه موردی',
  };

  const loadQuiz = async (t: TrainingItem) => {
    setQuizTraining(t);
    setResult(null);
    setAnswers({});
    const res = await api.get<{ data: any }>(`/quiz/training/${t.id}`).catch(() => null);
    if (res?.data) {
      setQuiz({ title: res.data.title, passScore: res.data.passScore, timeMinutes: res.data.timeMinutes, questions: res.data.questions || [] });
      if (res.data.timeMinutes) setSecondsLeft(res.data.timeMinutes * 60);
    } else {
      setQuiz(null);
    }
  };

  useEffect(() => {
    if (!quizTraining || result || secondsLeft == null) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null) return s;
        if (s <= 1) { clearInterval(iv); submitQuiz.mutate(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizTraining, result, secondsLeft != null]);

  const submitQuiz = useMutation({
    mutationFn: () => api.post(`/quiz/training/${quizTraining?.id}/submit`, { answers }),
    onSuccess: (data: any) => {
      setResult({ score: data.data.score, passed: data.data.passed });
      qc.invalidateQueries({ queryKey: ['my-training'] });
      toast({ title: data.data.passed ? 'آزمون قبول شد 🎉' : 'آزمون قبول نشد', variant: data.data.passed ? 'default' : 'destructive' });
    },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">آموزش‌های من</h1>
        <p className="text-muted-foreground text-sm">برنامه‌های آموزشی و آزمون‌ها</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !data?.data?.length ? (
        <Card className="p-10 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">آموزشی ثبت نشده است</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.data.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <Badge variant={t.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {t.status === 'COMPLETED' ? 'تکمیل‌شده' : t.status === 'IN_PROGRESS' ? 'در حال برگزاری' : t.status === 'PLANNED' ? 'برنامه‌ریزی‌شده' : t.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{typeLabels[t.type] || t.type}</span>
                  {t.instructor && <span>مدرس: {t.instructor}</span>}
                  {t.trainingDate && <span>تاریخ: {toJalaliDate(t.trainingDate)}</span>}
                </div>
                {(t.examScore != null || t.supervisorScore != null) && (
                  <div className="flex gap-4 pt-1">
                    {t.examScore != null && (
                      <span className="flex items-center gap-1 text-sm"><Award className="h-4 w-4 text-success" />نمره آزمون: {toPersianDigits(t.examScore)}</span>
                    )}
                    {t.supervisorScore != null && (
                      <span className="flex items-center gap-1 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />سرپرست: {toPersianDigits(t.supervisorScore)}</span>
                    )}
                  </div>
                )}
                {t.quiz && t.examScore == null && (
                  <div className="rounded-lg bg-violet-50/50 dark:bg-violet-950/20 p-2 text-xs text-violet-700 dark:text-violet-300 space-y-0.5">
                    <p className="font-medium">آزمون آماده است</p>
                    <p>تعداد سوال: {toPersianDigits(t.quiz._count?.questions ?? 0)} • نمره قبولی: {toPersianDigits(t.quiz.passScore)}٪</p>
                    {t.quiz.timeMinutes != null && <p>زمان: {toPersianDigits(t.quiz.timeMinutes)} دقیقه</p>}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => loadQuiz(t)}>
                    <ClipboardList className="h-4 w-4 ml-1" /> آزمون
                  </Button>
                  {t.status === 'COMPLETED' && t.examScore != null && (
                    <Button size="sm" variant="outline" onClick={() => downloadFile(`/quiz/training/${t.id}/certificate`, `گواهینامه-${t.title}.pdf`)}>
                      <FileDown className="h-4 w-4 ml-1" /> گواهینامه
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!quizTraining} onOpenChange={(o) => !o && setQuizTraining(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{quizTraining?.title} — آزمون</DialogTitle>
            {secondsLeft != null && !result && (
              <p className={`text-sm font-bold ${secondsLeft < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                زمان باقی‌مانده: {toPersianDigits(Math.floor(secondsLeft / 60))}:{toPersianDigits(secondsLeft % 60)}
              </p>
            )}
          </DialogHeader>
          {result ? (
            <div className="text-center py-6 space-y-3">
              <div className={`text-4xl font-bold ${result.passed ? 'text-success' : 'text-destructive'}`}>{toPersianDigits(result.score)}</div>
              <p className={result.passed ? 'text-success' : 'text-destructive'}>{result.passed ? 'تبریک! قبول شدید' : 'کافی نبود، دوباره تلاش کنید'}</p>
              {result.passed && (
                <Button onClick={() => downloadFile(`/quiz/training/${quizTraining?.id}/certificate`, 'گواهینامه.pdf')}>
                  <FileDown className="h-4 w-4 ml-2" /> دریافت گواهینامه
                </Button>
              )}
            </div>
          ) : !quiz ? (
            <p className="text-center text-muted-foreground py-6">برای این آموزش آزمونی تعریف نشده است</p>
          ) : (
            <div className="space-y-5">
              {quiz.questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <p className="font-medium text-sm">{toPersianDigits(qi + 1)}. {q.text}</p>
                  <div className="grid gap-1.5">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className={`text-right rounded-md border px-3 py-2 text-sm transition-colors ${answers[q.id] === oi ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button className="w-full" disabled={Object.keys(answers).length < quiz.questions.length || submitQuiz.isPending} onClick={() => submitQuiz.mutate()}>
                {submitQuiz.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                ثبت پاسخ‌ها
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}