'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Users, ListTodo, CheckCircle2, Clock, AlertTriangle, TrendingUp, Plus, ArrowRight, BarChart3, Download, Columns3, FolderKanban, Send, Mic, Paperclip, Pin, MessageSquare, ChevronRight } from 'lucide-react';
import { toJalaliDate, toJalaliDateTime, toPersianDigits } from '@/lib/date';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { downloadFile, resolveAvatarUrl } from '@/lib/utils';
import { RoleCode } from '@amatis/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TASK_STATUS_LABELS } from '@/lib/labels';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const resolveUrl = resolveAvatarUrl;
const chatColors = { grid: 'hsl(var(--border))', axis: 'hsl(var(--muted-foreground))', tooltipBg: 'hsl(var(--card))', tooltipText: 'hsl(var(--card-foreground))' };

interface MemberReport { id: string; firstName: string; lastName: string; employeeCode: string; tasks: number; completed: number; inProgress: number; delayed: number; pending: number; kpi: number | null }
interface ProjectReport { project: any; totalTasks: number; completedTasks: number; inProgressTasks: number; delayedTasks: number; progress: number; members: MemberReport[] }
interface ChatMsg { id: string; content: string; createdAt: string; senderId: string; type?: string; pinned?: boolean; editedAt?: string; sender?: { id: string; mobile: string; employeeProfile?: { id: string; firstName: string; lastName: string; avatarUrl?: string } } }

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(RoleCode.SUPER_ADMIN) || hasRole(RoleCode.CEO);
  const isEmployeeRole = hasRole(RoleCode.EMPLOYEE) || hasRole(RoleCode.EXPERT_L1) || hasRole(RoleCode.EXPERT_L2) || hasRole(RoleCode.EXPERT_L3) || hasRole(RoleCode.SALES_CONSULTANT) || hasRole(RoleCode.TECH_COMMITTEE_MEMBER) || hasRole(RoleCode.TECH_COMMITTEE_MANAGER);

  const [showMember, setShowMember] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [kanbanEmployeeFilter, setKanbanEmployeeFilter] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ taskTemplateId: '', employeeId: '', projectId: id, deadline: '', priority: 'MEDIUM' });
  const [chatMsg, setChatMsg] = useState('');
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['project-report', id],
    queryFn: () => api.get<{ data: ProjectReport }>(`/projects/${id}/report`),
  });

  const { data: projectTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => api.get<{ success: boolean; data: any[] }>(`/tasks?limit=200&projectId=${id}`),
  });

  const { data: employees } = useQuery({ queryKey: ['project-employees'], queryFn: () => api.get<{ data: any[] }>('/employees?limit=100') });
  const { data: templates } = useQuery({ queryKey: ['project-templates'], queryFn: () => api.get<{ success: boolean; data: any[] }>('/task-templates?limit=100') });
  const { data: allProjects } = useQuery({ queryKey: ['project-list-all'], queryFn: () => api.get<{ success: boolean; data: any[] }>('/projects?limit=100') });

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', { ...taskForm, deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['project-report', id] });
      setShowCreateTask(false);
      setTaskForm({ taskTemplateId: '', employeeId: '', projectId: id, deadline: '', priority: 'MEDIUM' });
      toast({ title: 'تسک ایجاد شد' });
    },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const kanbanColumns = [
    { key: 'NOT_STARTED', title: 'شروع نشده', color: 'bg-muted' },
    { key: 'IN_PROGRESS', title: 'در حال انجام', color: 'bg-blue-500/15 text-blue-600' },
    { key: 'SUBMITTED', title: 'ارسال شده', color: 'bg-violet-500/15 text-violet-600' },
    { key: 'NEED_REVISION', title: 'نیازمند اصلاح', color: 'bg-warning/15 text-warning' },
    { key: 'APPROVED', title: 'تأیید شده', color: 'bg-success/15 text-success' },
  ];
  const kanbanTasks = projectTasks?.data || [];
  const visibleKanbanTasks = isEmployeeRole
    ? kanbanTasks.filter((t) => t.employee?.id === user?.employeeProfile?.id)
    : kanbanTasks;
  const taskById = (statusKey: string) => visibleKanbanTasks.filter((t) => t.status === statusKey);
  const now = new Date();
  const isDelayed = (t: any) => t.isDelayed || (t.deadline && !['APPROVED','CANCELLED'].includes(t.status) && new Date(t.deadline) < now);

  // --- Embedded Chat ---
  const { data: roomsData } = useQuery({ queryKey: ['project-chat-room', id], queryFn: () => api.get<{ data: any[] }>('/chat/rooms') });
  const projectRoom = (roomsData?.data || []).find((r) => r.type === 'PROJECT' && r.project?.id === id);

  const ensureRoom = useMutation({
    mutationFn: () => api.post<{ data: { id: string } }>('/chat/rooms/project', { projectId: id, name: report?.data?.project?.name || 'پروژه' }),
    onSuccess: (data) => setChatRoomId(data.data?.id),
  });

  useEffect(() => {
    if (projectRoom?.id) setChatRoomId(projectRoom.id);
    else if (report && !projectRoom) ensureRoom.mutate();
  }, [projectRoom?.id, report]);

  const { data: chatData } = useQuery({
    queryKey: ['project-chat-msgs', chatRoomId],
    queryFn: () => api.get<{ data: ChatMsg[] }>(`/chat/rooms/${chatRoomId}/messages?limit=50`),
    enabled: !!chatRoomId,
    refetchInterval: 5000,
  });
  useEffect(() => { if (chatData?.data) setChatMsgs(chatData.data); }, [chatData]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const sendChatMsg = useMutation({
    mutationFn: () => api.post(`/chat/rooms/${chatRoomId}/messages`, { content: chatMsg }),
    onSuccess: () => { setChatMsg(''); qc.invalidateQueries({ queryKey: ['project-chat-msgs', chatRoomId] }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const pinMsg = useMutation({
    mutationFn: ({ msgId, pinned }: { msgId: string; pinned: boolean }) => api.post(`/chat/messages/${msgId}/pin`, { pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-chat-msgs', chatRoomId] }),
  });

  const uploadChatFile = async (file: File) => {
    if (!chatRoomId) return;
    if (file.size > 50 * 1024 * 1024) { alert('حجم فایل حداکثر ۵۰ مگابایت'); return; }
    setUploadingFile(true);
    const fd = new FormData(); fd.append('file', file);
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`http://localhost:4041/api/v1/chat/rooms/${chatRoomId}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      qc.invalidateQueries({ queryKey: ['project-chat-msgs', chatRoomId] });
    } finally { setUploadingFile(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        const fd = new FormData(); fd.append('file', blob, `voice-${Date.now()}.${ext}`);
        const token = localStorage.getItem('accessToken');
        if (chatRoomId) fetch(`http://localhost:4041/api/v1/chat/rooms/${chatRoomId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }).then(() => qc.invalidateQueries({ queryKey: ['project-chat-msgs', chatRoomId] }));
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        setIsRecording(false); setRecTime(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(); setIsRecording(true); setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch { alert('دسترسی به میکروفون مجاز نیست'); }
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();
  const cancelRecording = () => { if (recTimerRef.current) clearInterval(recTimerRef.current); mediaRecorderRef.current?.stream?.getTracks()?.forEach(t => t.stop()); mediaRecorderRef.current = null; setIsRecording(false); setRecTime(0); };

  const addMember = useMutation({
    mutationFn: () => api.post(`/projects/${id}/members`, { employeeId: memberId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-report', id] }); setShowMember(false); setMemberId(''); },
  });
  const removeMember = useMutation({
    mutationFn: (empId: string) => api.delete(`/projects/${id}/members/${empId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-report', id] }),
  });
  const moveTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-tasks', id] }); qc.invalidateQueries({ queryKey: ['project-report', id] }); },
  });
  const KANBAN_FLOW: Record<string, string[]> = { NOT_STARTED: ['IN_PROGRESS'], IN_PROGRESS: ['SUBMITTED', 'NEED_REVISION'], SUBMITTED: ['APPROVED', 'NEED_REVISION'], NEED_REVISION: ['IN_PROGRESS'], APPROVED: [] };

  if (isLoading) return (
    <div className="space-y-6 p-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><div className="grid gap-4 lg:grid-cols-2">{Array.from({length:2}).map((_,i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div></div>
  );
  if (!report) return <Card className="p-8 text-center text-destructive">گزارش پروژه یافت نشد</Card>;

  const d = report.data;
  const chartData = d.members.map(m => ({ name: `${m.firstName} ${m.lastName}`, tasks: m.tasks, completed: m.completed, delayed: m.delayed }));
  const pinnedMsgs = chatMsgs.filter(m => m.pinned && m.type !== 'SYSTEM');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowRight className="h-4 w-4" /></Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white overflow-hidden shadow-md shrink-0">
            {d.project.logoUrl ? <img src={resolveUrl(d.project.logoUrl)} alt={d.project.name} className="h-full w-full object-cover" /> : <FolderKanban className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{d.project.name}</h1>
            <p className="text-muted-foreground text-sm">{d.project.code} • {toJalaliDate(d.project.startDate)} تا {toJalaliDate(d.project.endDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadFile(`/exports/project/${id}`, `پروژه-${d.project.code}.xlsx`)}><Download className="h-4 w-4 ml-1" /> Excel</Button>
          <Badge variant={d.project.isActive ? 'default' : 'secondary'}>{d.project.isActive ? 'فعال' : 'غیرفعال'}</Badge>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          { label: 'کل تسک‌ها', value: d.totalTasks, color: '' },
          { label: 'تکمیل‌شده', value: d.completedTasks, color: 'text-success' },
          { label: 'در حال انجام', value: d.inProgressTasks, color: 'text-blue-600' },
          { label: 'عقب‌افتاده', value: d.delayedTasks, color: 'text-destructive' },
          { label: 'پیشرفت', value: `${d.progress}٪`, color: '' },
          { label: 'اعضا', value: d.members.length, color: '' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{toPersianDigits(typeof s.value === 'number' ? s.value : s.value)}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Members + Chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        {!isEmployeeRole && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> عملکرد اعضا</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? <p className="text-center text-muted-foreground pt-20">عضوی ثبت نشده</p> : (
              <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chatColors.grid} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: chatColors.axis }} /><YAxis tick={{ fill: chatColors.axis }} />
                <Tooltip contentStyle={{ backgroundColor: chatColors.tooltipBg, color: chatColors.tooltipText, border: '1px solid ' + chatColors.grid }} />
                <Bar dataKey="tasks" name="کل" fill="#3b82f6" radius={[4,4,0,0]} /><Bar dataKey="completed" name="تکمیل" fill="#22c55e" radius={[4,4,0,0]} /><Bar dataKey="delayed" name="تأخیر" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>)}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> اعضا</CardTitle>
            {isAdmin && <Button size="sm" variant="outline" onClick={() => setShowMember(true)}><Plus className="h-4 w-4 ml-1" /> افزودن</Button>}
          </CardHeader>
          <CardContent className="space-y-2">
            {d.members.length === 0 ? <p className="text-center text-muted-foreground py-8">عضوی ثبت نشده</p> : d.members.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3 min-w-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">{m.firstName.charAt(0)}{m.lastName.charAt(0)}</div>
                  <div className="min-w-0"><p className="font-medium truncate">{m.firstName} {m.lastName}</p><p className="text-xs text-muted-foreground">{m.employeeCode} • {toPersianDigits(m.tasks)} تسک</p></div>
                </div>
                <div className="flex items-center gap-2">{m.kpi != null && <Badge variant="outline">KPI {toPersianDigits(m.kpi)}</Badge>}{isAdmin && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember.mutate(m.id)}>حذف</Button>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {!isEmployeeRole && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card><CardHeader><CardTitle className="text-base">مقایسه کارشناسان</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead>
            <tr className="border-b text-muted-foreground"><th className="text-right py-2 px-2">کارمند</th><th className="text-center py-2 px-2">تسک</th><th className="text-center py-2 px-2">تکمیل</th><th className="text-center py-2 px-2">در جریان</th><th className="text-center py-2 px-2">تأخیر</th><th className="text-center py-2 px-2">KPI</th></tr>
          </thead><tbody>
            {d.members.map(m => <tr key={m.id} className="border-b hover:bg-muted/50">
              <td className="py-2 px-2 font-medium">{m.firstName} {m.lastName}</td>
              <td className="text-center py-2 px-2">{toPersianDigits(m.tasks)}</td>
              <td className="text-center py-2 px-2 text-success">{toPersianDigits(m.completed)}</td>
              <td className="text-center py-2 px-2 text-blue-600">{toPersianDigits(m.inProgress)}</td>
              <td className="text-center py-2 px-2 text-destructive">{toPersianDigits(m.delayed)}</td>
              <td className="text-center py-2 px-2">{m.kpi != null ? toPersianDigits(m.kpi) : '—'}</td>
            </tr>)}
          </tbody></table></CardContent>
        </Card>
      </motion.div>)}

      {/* Personal Performance for Employee */}
      {isEmployeeRole && (() => {
        const me = d.members.find(m => m.id === user?.employeeProfile?.id);
        if (!me) return null;
        return (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> عملکرد شخصی من در این پروژه</CardTitle></CardHeader>
            <CardContent className="h-72">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">کل تسک‌ها</p><p className="text-xl font-bold">{toPersianDigits(me.tasks)}</p></div>
                <div className="rounded-lg bg-success/10 p-3 text-center"><p className="text-xs text-success">تکمیل‌شده</p><p className="text-xl font-bold text-success">{toPersianDigits(me.completed)}</p></div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center"><p className="text-xs text-blue-600">در جریان</p><p className="text-xl font-bold text-blue-600">{toPersianDigits(me.inProgress)}</p></div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center"><p className="text-xs text-destructive">تأخیر</p><p className="text-xl font-bold text-destructive">{toPersianDigits(me.delayed)}</p></div>
              </div>
              <ResponsiveContainer width="100%" height="65%">
                <BarChart data={[{ name: 'من', tasks: me.tasks, completed: me.completed, inProgress: me.inProgress, delayed: me.delayed }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chatColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: chatColors.axis }} />
                  <YAxis tick={{ fill: chatColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chatColors.tooltipBg, color: chatColors.tooltipText }} />
                  <Bar dataKey="tasks" name="کل" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="completed" name="تکمیل" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="inProgress" name="در جریان" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="delayed" name="تأخیر" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Kanban */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Columns3 className="h-4 w-4" /> کانبان</CardTitle>
          {!isEmployeeRole && <Button size="sm" variant="outline" onClick={() => setShowCreateTask(true)}><Plus className="h-4 w-4 ml-1" /> ایجاد تسک</Button>}
        </CardHeader>
        <CardContent>
          {tasksLoading ? <div className="grid grid-cols-5 gap-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div> : kanbanTasks.length === 0 ? <p className="text-center text-muted-foreground py-8">تسکی ثبت نشده</p> : (
            <>
              <div className="flex items-center gap-3 mb-4"><Label className="shrink-0">فیلتر:</Label>
                <Select value={kanbanEmployeeFilter} onValueChange={setKanbanEmployeeFilter} className="max-w-[220px]">
                  <option value="">همه</option>{Array.from(new Set(kanbanTasks.map(t => t.employee?.id).filter(Boolean))).map(eid => { const emp = kanbanTasks.find(t => t.employee?.id === eid)?.employee; return <option key={eid} value={eid}>{emp?.firstName} {emp?.lastName}</option>; })}
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {kanbanColumns.map(col => {
                  const colTasks = taskById(col.key).filter(t => !kanbanEmployeeFilter || t.employee?.id === kanbanEmployeeFilter);
                  return <div key={col.key} className="rounded-lg bg-muted/40 p-2 min-h-[120px]">
                    <div className={`text-xs font-medium px-2 py-1.5 rounded-md mb-2 ${col.color}`}>{col.title} ({toPersianDigits(colTasks.length)})</div>
                    <div className="space-y-2">{colTasks.map(t => (
                      <div key={t.id} className="rounded-md bg-card border p-2.5">
                        <button type="button" onClick={() => setSelectedTask(t)} className="w-full text-right">
                          <p className="text-xs font-medium line-clamp-2 hover:text-primary">{t.taskTemplate?.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{t.employee?.firstName} {t.employee?.lastName}</p>
                          {t.deadline && <p className="text-[10px] text-muted-foreground mt-0.5">مهلت: {toJalaliDate(t.deadline)}</p>}
                        </button>
                        {isDelayed(t) && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive mt-1">تأخیر</span>}
                        {(KANBAN_FLOW[t.status]||[]).length > 0 && <div className="flex gap-1 mt-2">{(KANBAN_FLOW[t.status]||[]).map(target => <button key={target} type="button" onClick={() => moveTask.mutate({taskId:t.id,status:target})} className="flex-1 rounded bg-muted text-[10px] py-1 hover:bg-primary/10 hover:text-primary">{TASK_STATUS_LABELS[target]||target}</button>)}</div>}
                      </div>
                    ))}{colTasks.length === 0 && <p className="text-center text-[11px] text-muted-foreground py-3">—</p>}</div>
                  </div>;
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Embedded Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> گفتگوی پروژه</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col h-[400px]">
            {pinnedMsgs.length > 0 && <div className="px-4 pt-2 pb-1 border-b bg-warning/5">{pinnedMsgs.map(p => <div key={p.id} className="flex items-center gap-2 text-xs py-0.5"><Pin className="h-3 w-3 text-warning shrink-0" /><span className="text-muted-foreground truncate">{p.sender?.employeeProfile?.firstName || 'کاربر'}: {p.content}</span></div>)}</div>}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMsgs.filter(m => m.type !== 'SYSTEM').map(m => {
                const isMine = m.senderId === user?.id;
                return <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!isMine && m.sender?.employeeProfile && <p className="text-[10px] opacity-70 mb-1">{m.sender.employeeProfile.firstName} {m.sender.employeeProfile.lastName}</p>}
                    {m.type === 'FILE' ? <a href={JSON.parse(m.content).url} target="_blank" rel="noreferrer" className="underline text-sm break-words">{JSON.parse(m.content).fileName}</a> : <p className="text-sm break-words">{m.content}</p>}
                    <div className={`flex items-center gap-2 mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      <span className="text-[10px]">{toJalaliDateTime(m.createdAt)}</span>
                      {m.pinned && <Pin className="h-3 w-3" />}
                    </div>
                  </div>
                </div>;
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t flex gap-2 items-center">
              {isRecording ? (
                <><span className="text-xs text-destructive font-medium whitespace-nowrap"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse inline-block ml-1" />{toPersianDigits(recTime)}ث</span>
                  <Button size="sm" variant="destructive" onClick={stopRecording}><Send className="h-4 w-4 ml-1" /> ارسال</Button>
                  <Button size="sm" variant="ghost" onClick={cancelRecording}>انصراف</Button></>
              ) : (
                <><Button variant="ghost" size="icon" onClick={startRecording} disabled={!chatRoomId}><Mic className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={!chatRoomId || uploadingFile} onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadChatFile(f); e.target.value = ''; }} /></>
              )}
              <Input ref={chatInputRef} value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && chatMsg.trim() && sendChatMsg.mutate()} placeholder="پیام..." className="flex-1" />
              <Button onClick={() => sendChatMsg.mutate()} disabled={!chatMsg.trim() || !chatRoomId}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> ایجاد تسک در این پروژه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>قالب تسک *</Label>
              <Select value={taskForm.taskTemplateId} onValueChange={(v) => setTaskForm({ ...taskForm, taskTemplateId: v })}>
                <option value="">انتخاب قالب...</option>
                {(templates?.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div><Label>کارمند *</Label>
              <Select value={taskForm.employeeId} onValueChange={(v) => setTaskForm({ ...taskForm, employeeId: v })}>
                <option value="">انتخاب کارمند...</option>
                {(d.members || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>اولویت</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <option value="LOW">کم</option><option value="MEDIUM">متوسط</option><option value="HIGH">زیاد</option><option value="URGENT">فوری</option>
                </Select>
              </div>
              <div><Label>مهلت</Label><JalaliDatePicker value={taskForm.deadline} onChange={(v) => setTaskForm({ ...taskForm, deadline: v })} disablePast /></div>
            </div>
            <Button className="w-full" disabled={!taskForm.taskTemplateId || !taskForm.employeeId} onClick={() => createTask.mutate()}>
              {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              ایجاد تسک
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent><DialogHeader><DialogTitle className="text-lg">{selectedTask?.taskTemplate?.name}</DialogTitle></DialogHeader>
          {selectedTask && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">وضعیت</span><p className="font-medium mt-0.5">{TASK_STATUS_LABELS[selectedTask.status] || selectedTask.status}</p></div>
              <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">کارشناس</span><p className="font-medium mt-0.5">{selectedTask.employee?.firstName} {selectedTask.employee?.lastName}</p></div>
              <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">اولویت</span><p className="font-medium mt-0.5">{selectedTask.priority || '—'}</p></div>
              <div className="rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">مهلت</span><p className="font-medium mt-0.5">{toJalaliDate(selectedTask.deadline)}</p></div>
            </div>
            {selectedTask.notes && <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">توضیحات</span><p className="text-sm mt-1">{selectedTask.notes}</p></div>}
            <Button className="w-full" variant="outline" onClick={() => router.push(`/tasks/${selectedTask.id}`)}>جزئیات کامل</Button>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog open={showMember} onOpenChange={setShowMember}>
        <DialogContent><DialogHeader><DialogTitle>افزودن عضو</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><Label>کارمند</Label><Select value={memberId} onValueChange={setMemberId}><option value="">انتخاب...</option>{(employees?.data||[]).map((e:any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</Select></div>
            <Button className="w-full" disabled={!memberId} onClick={() => addMember.mutate()}>افزودن</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}