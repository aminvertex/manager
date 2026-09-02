'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Play, Send, RefreshCcw, CheckCircle2, XCircle, FileUp, MessageSquare, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES, PRIORITY_LABELS, EVALUATION_CRITERIA_LABELS } from '@/lib/labels';
import { toJalaliDateTime, toJalaliDate, toPersianDigits } from '@/lib/date';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { RoleCode } from '@amatis/types';

interface TaskDetail {
  id: string;
  assignmentCode: string;
  status: string;
  progress: number;
  priority: string;
  deadline: string | null;
  startTime: string | null;
  completionTime: string | null;
  actualDurationMinutes: number | null;
  revisionCount: number;
  qualityScore: number | null;
  supervisorScore: number | null;
  isDelayed: boolean;
  delayDays: number;
  notes: string | null;
  taskTemplate: {
    name: string; category: string; description: string | null;
    expectedOutput: string | null; standardDurationMinutes: number | null;
    requiresSupervisorApproval: boolean;
  };
  employee: { id: string; firstName: string; lastName: string };
  project: { name: string } | null;
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; comment: string | null; createdAt: string; changedBy?: { id: string; firstName: string; lastName: string } }>;
  revisions: Array<{ id: string; revisionNumber: number; reason: string | null; comment: string | null; status: string; requestedAt: string; dueDate: string | null }>;
  attachments: Array<{ id: string; originalName: string; version: number; size: number | null; createdAt: string }>;
  comments: Array<{ id: string; message: string; createdAt: string; author?: { id: string; mobile: string; employeeProfile?: { id: string; firstName: string; lastName: string; avatarUrl?: string } } }>;
  evaluation: { scores: Record<string, number>; score100: number | null; result: string; comment: string | null } | null;
  qualityControl: { qualityScore: number | null; result: string; comment: string | null } | null;
}

export default function TaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { user } = useAuth();
  const qc = useQueryClient();
  const isSupervisor = user?.roles.includes(RoleCode.SUPERVISOR) || user?.roles.includes(RoleCode.SUPER_ADMIN) || user?.roles.includes(RoleCode.CEO);

  const [showSubmit, setShowSubmit] = useState(searchParams.get('action') === 'submit');
  const [showRevision, setShowRevision] = useState(false);
  const [showEvaluate, setShowEvaluate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionComment, setRevisionComment] = useState('');
  const [revisionDue, setRevisionDue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [evalResult, setEvalResult] = useState('APPROVED');
  const [evalComment, setEvalComment] = useState('');

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<{ data: TaskDetail }>(`/tasks/${id}`),
  });
  const t = task?.data;

  const setStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); qc.invalidateQueries({ queryKey: ['my-tasks'] }); toast({ title: 'وضعیت به‌روزرسانی شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const updateProgress = useMutation({
    mutationFn: () => api.patch(`/tasks/${id}/progress`, { progress }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); toast({ title: 'پیشرفت ثبت شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const requestRevision = useMutation({
    mutationFn: () => api.post(`/tasks/${id}/revision`, { reason: revisionReason, comment: revisionComment, dueDate: revisionDue || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); setShowRevision(false); toast({ title: 'درخواست اصلاح ثبت شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const evaluate = useMutation({
    mutationFn: () => api.post('/evaluations', { taskAssignmentId: id, scores, result: evalResult, comment: evalComment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); qc.invalidateQueries({ queryKey: ['my-tasks'] }); setShowEvaluate(false); toast({ title: 'ارزیابی ثبت شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('فایلی انتخاب نشده');
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/tasks/${id}/attachment`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!res.ok) throw new Error('خطا در آپلود فایل');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); setFile(null); toast({ title: 'فایل آپلود شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as Error).message, variant: 'destructive' }),
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/tasks/${id}/comment`, { message: comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); setComment(''); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !t) return <Card className="p-8 text-center text-destructive">تسک یافت نشد</Card>;

  const canStart = ['ASSIGNED', 'NOT_STARTED'].includes(t.status);
  const canSubmit = ['IN_PROGRESS', 'NEED_REVISION'].includes(t.status);
  const canReview = isSupervisor && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(t.status);
  const canEditProgress =
    t.employee?.id === user?.employeeProfile?.id ||
    user?.roles?.includes(RoleCode.SUPER_ADMIN) ||
    user?.roles?.includes(RoleCode.CEO) ||
    user?.roles?.includes(RoleCode.TECH_COMMITTEE_MANAGER) ||
    user?.roles?.includes(RoleCode.TECH_COMMITTEE_MEMBER);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t.taskTemplate.name}</h1>
            <Badge className={TASK_STATUS_STYLES[t.status] || ''}>{TASK_STATUS_LABELS[t.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.assignmentCode} • {t.taskTemplate.category} {t.project ? `• ${t.project.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStart && <Button onClick={() => setStatus.mutate('IN_PROGRESS')}><Play className="h-4 w-4 ml-2" />شروع تسک</Button>}
          {canSubmit && <Button onClick={() => setStatus.mutate('SUBMITTED')}><Send className="h-4 w-4 ml-2" />تحویل تسک</Button>}
          {canReview && <Button variant="outline" onClick={() => setShowRevision(true)}><RefreshCcw className="h-4 w-4 ml-2" />درخواست اصلاح</Button>}
          {canReview && <Button onClick={() => setShowEvaluate(true)}><CheckCircle2 className="h-4 w-4 ml-2" />ارزیابی</Button>}
          {t.status !== 'APPROVED' && t.status !== 'CANCELLED' && <Button variant="ghost" onClick={() => setShowSubmit(true)}><FileUp className="h-4 w-4 ml-2" />آپلود خروجی</Button>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">اطلاعات تسک</TabsTrigger>
              <TabsTrigger value="output">خروجی و فایل‌ها</TabsTrigger>
              <TabsTrigger value="history">تاریخچه</TabsTrigger>
              <TabsTrigger value="comments">نظرات</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label>شرح</Label>
                    <p className="text-sm mt-1 text-muted-foreground">{t.taskTemplate.description || '—'}</p>
                  </div>
                  <div>
                    <Label>خروجی مورد انتظار</Label>
                    <p className="text-sm mt-1 text-muted-foreground">{t.taskTemplate.expectedOutput || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div><Label className="text-xs text-muted-foreground">اولویت</Label><p>{PRIORITY_LABELS[t.priority] || t.priority}</p></div>
                    <div><Label className="text-xs text-muted-foreground">مهلت</Label><p>{toJalaliDate(t.deadline)}</p></div>
                    <div><Label className="text-xs text-muted-foreground">زمان استاندارد</Label><p>{t.taskTemplate.standardDurationMinutes ? toPersianDigits(t.taskTemplate.standardDurationMinutes) + ' دقیقه' : '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">شروع</Label><p>{toJalaliDateTime(t.startTime)}</p></div>
                    <div><Label className="text-xs text-muted-foreground">تکمیل</Label><p>{toJalaliDateTime(t.completionTime)}</p></div>
                    <div><Label className="text-xs text-muted-foreground">تعداد اصلاحات</Label><p className={t.revisionCount > 0 ? 'text-warning' : ''}>{toPersianDigits(t.revisionCount)}</p></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">پیشرفت</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={t.progress} className="flex-1" />
                      <span className="text-sm font-medium">{toPersianDigits(t.progress)}٪</span>
                    </div>
                  </div>
                  {canEditProgress && (
                    <div className="flex items-center gap-4 pt-2">
                      <Input type="number" min={0} max={100} value={progress || t.progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-28" />
                      <Button size="sm" variant="outline" onClick={() => updateProgress.mutate()}>ثبت پیشرفت</Button>
                    </div>
                  )}
                  {t.isDelayed && t.delayDays > 0 && (
                    <div className="rounded-lg bg-destructive/10 p-3 flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" /> این تسک {toPersianDigits(t.delayDays)} روز تأخیر دارد
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="output">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Button onClick={() => setShowSubmit(true)}><FileUp className="h-4 w-4 ml-2" />آپلود نسخه جدید</Button>
                  {t.attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">فایلی آپلود نشده است</p>
                  ) : (
                    <div className="space-y-2">
                      {t.attachments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium">نسخه {toPersianDigits(a.version)} — {a.originalName}</p>
                            <p className="text-xs text-muted-foreground">{toJalaliDateTime(a.createdAt)}</p>
                          </div>
                          <Badge variant="secondary">v{toPersianDigits(a.version)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[...t.statusHistory].reverse().map((h, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          {i < t.statusHistory.length - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm">
                            <span className="text-muted-foreground">{h.fromStatus ? TASK_STATUS_LABELS[h.fromStatus] : '—'}</span>
                            {' ← '}<span className="font-medium">{TASK_STATUS_LABELS[h.toStatus]}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{toJalaliDateTime(h.createdAt)}{h.changedBy ? ` • ${h.changedBy.firstName} ${h.changedBy.lastName}` : ''}</p>
                          {h.comment && <p className="text-sm mt-1">{h.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-2">
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نظر خود را بنویسید..." className="min-h-[60px]" />
                    <Button onClick={() => addComment.mutate()} disabled={!comment.trim()}><MessageSquare className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-3">
                    {t.comments.length === 0 && <p className="text-sm text-muted-foreground">نظری ثبت نشده است</p>}
                    {t.comments.map((c) => (
                      <div key={c.id} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {c.author?.employeeProfile ? `${c.author.employeeProfile.firstName} ${c.author.employeeProfile.lastName}` : (c.author?.mobile || 'کاربر')}
                          </span>
                          <span className="text-xs text-muted-foreground">• {toJalaliDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {t.evaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ارزیابی سرپرست</CardTitle>
                <CardDescription>نتیجه: {t.evaluation.result === 'APPROVED' ? 'تأیید شده' : t.evaluation.result === 'NEED_REVISION' ? 'نیازمند اصلاح' : t.evaluation.result === 'REJECTED' ? 'رد شده' : t.evaluation.result}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">امتیاز کل</span>
                  <Badge className={t.evaluation.score100! >= 80 ? 'bg-success/15 text-success' : t.evaluation.score100! >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}>
                    {toPersianDigits(t.evaluation.score100 ?? 0)}
                  </Badge>
                </div>
                {Object.entries(t.evaluation.scores || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{EVALUATION_CRITERIA_LABELS[k] || k}</span>
                    <span>{toPersianDigits(v)}</span>
                  </div>
                ))}
                {t.evaluation.comment && <p className="text-sm text-muted-foreground mt-2">{t.evaluation.comment}</p>}
              </CardContent>
            </Card>
          )}

          {t.revisions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">اصلاحات</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {t.revisions.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">اصلاح {toPersianDigits(r.revisionNumber)}</span>
                      <Badge variant="outline">{r.status}</Badge>
                    </div>
                    {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{toJalaliDateTime(r.requestedAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>آپلود خروجی</DialogTitle>
            <DialogDescription>فایل خروجی تسک را انتخاب و آپلود کنید (حداکثر ۲۰MB)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button className="w-full" disabled={!file || uploadFile.isPending} onClick={() => uploadFile.mutate()}>
              {uploadFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 ml-2" />}
              آپلود
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevision} onOpenChange={setShowRevision}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>درخواست اصلاح</DialogTitle>
            <DialogDescription>دلیل و توضیحات اصلاح را ثبت کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>دلیل اصلاح *</Label>
              <Input value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="مثلاً: دقت علمی نیاز به بازبینی دارد" />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea value={revisionComment} onChange={(e) => setRevisionComment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>مهلت اصلاح</Label>
              <JalaliDatePicker value={revisionDue} onChange={setRevisionDue} />
            </div>
            <Button className="w-full" disabled={!revisionReason.trim() || requestRevision.isPending} onClick={() => requestRevision.mutate()}>
              ثبت درخواست اصلاح
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvaluate} onOpenChange={setShowEvaluate}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ارزیابی تسک</DialogTitle>
            <DialogDescription>امتیاز ۱ تا ۵ برای هر معیار (۵ = عالی)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(EVALUATION_CRITERIA_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-sm">{label}</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [key]: n }))}
                      className={`h-8 w-8 rounded-md text-sm font-medium border transition-colors ${scores[key] === n ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {toPersianDigits(n)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2 pt-2">
              <Label>نتیجه</Label>
              <Select value={evalResult} onValueChange={setEvalResult}>
                <option value="APPROVED">تأیید</option>
                <option value="APPROVED_WITH_COMMENT">تأیید با نظر</option>
                <option value="NEED_REVISION">نیازمند اصلاح</option>
                <option value="REJECTED">رد</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نظر سرپرست</Label>
              <Textarea value={evalComment} onChange={(e) => setEvalComment(e.target.value)} />
            </div>
            <Button className="w-full" disabled={Object.keys(scores).length < 10 || evaluate.isPending} onClick={() => evaluate.mutate()}>
              ثبت ارزیابی
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
