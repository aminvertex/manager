'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { JalaliMonthPicker } from '@/components/ui/jalali-month-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Users, ListTodo, CheckCircle2, Clock, AlertTriangle, TrendingUp, BarChart3, Brain } from 'lucide-react';
import { RoleCode } from '@amatis/types';
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES, PRIORITY_LABELS } from '@/lib/labels';
import { toPersianDigits, toJalali } from '@/lib/date';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

function StatCard({ title, value, icon: Icon, color = 'text-primary', subtitle }: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color?: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? toPersianDigits(value) : value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#6b7280'];

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [fProject, setFProject] = useState('');
  const [fEmployee, setFEmployee] = useState('');
  const [fSupervisor, setFSupervisor] = useState('');
  const [fStatus, setFStatus] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['dash-projects'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; name: string }[] }>('/projects?limit=100'),
  });

  const { data: employees } = useQuery({
    queryKey: ['dash-employees'],
    queryFn: () => api.get<{ success: boolean; data: any[] }>('/employees?limit=200'),
  });

  const { data: supervisors } = useQuery({
    queryKey: ['dash-supervisors'],
    queryFn: () => api.get<{ success: boolean; data: any[] }>('/employees?limit=100&roleCode=SUPERVISOR'),
  });

  const qs = new URLSearchParams({ period });
  if (fProject) qs.set('projectId', fProject);
  if (fEmployee) qs.set('employeeId', fEmployee);
  if (fSupervisor) qs.set('supervisorId', fSupervisor);
  if (fStatus) qs.set('status', fStatus);
  const qStr = qs.toString();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', qStr],
    queryFn: () => api.get<{
      cards: {
        totalEmployees: number; totalTasks: number; completedTasks: number;
        completionRate: number; onTimeRate: number; delayedTasks: number;
        needRevisionTasks: number; averageQuality: number | null;
        averagePerformance: number | null; dailyChecklistCompletion: number;
        numberOfCases: number; numberOfErrors: number; trainingSessions: number;
      };
    }>(`/dashboard/executive?${qStr}`),
  });

  const { data: charts } = useQuery({
    queryKey: ['dashboard-charts', qStr],
    queryFn: () => api.get<{
      employeeComparison: Array<{ name: string; tasks: number; completed: number }>;
      weeklyTrend: Array<{ week: string; completed: number; total: number; onTime: number }>;
      taskStatus: Record<string, number>;
      qualityComparison: Array<{ name: string; quality: number | null }>;
      projectPerformance: Array<{ name: string; tasks: number; completed: number }>;
      employeeProductivity: Array<{ name: string; completed: number }>;
      revisionRate: number;
      monthlyTrend: Array<{ period: string; finalScore: number }>;
      kpiStatus: { green: number; yellow: number; red: number };
    }>(`/dashboard/charts?${qStr}`),
  });

  const c = dash?.cards;
  const supervisorData = { teamSize: 0, pendingReviews: 0, needRevision: 0, delayedTasks: 0, teamKpi: null };

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-32" /></div>
      <div className="flex gap-2"><Skeleton className="h-10 w-32 rounded-md" /><Skeleton className="h-10 w-40 rounded-md" /></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    </div>
  );

  const taskStatusChart = charts?.taskStatus ? Object.entries(charts.taskStatus).map(([k, v]) => ({ name: TASK_STATUS_LABELS[k] || k, value: v })) : [];
  const kpiPie = charts?.kpiStatus ? [
    { name: 'عملکرد بالا', value: charts.kpiStatus.green, color: '#22c55e' },
    { name: 'نیازمند توسعه', value: charts.kpiStatus.yellow, color: '#f59e0b' },
    { name: 'نیازمند مداخله', value: charts.kpiStatus.red, color: '#ef4444' },
  ] : [];

  const chartColors = { grid: 'hsl(var(--border))', axis: 'hsl(var(--muted-foreground))', tooltipBg: 'hsl(var(--card))', tooltipText: 'hsl(var(--card-foreground))' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {user?.employeeProfile ? `خوش آمدید، ${user.employeeProfile.firstName}` : 'داشبورد'}
        </h1>
        <p className="text-muted-foreground text-sm">نمای کلی عملکرد</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-card p-3">
        <JalaliMonthPicker value={period} onChange={setPeriod} />
        <Select value={fProject} onValueChange={setFProject}>
          <option value="">همه پروژه‌ها</option>
          {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={fEmployee} onValueChange={setFEmployee}>
          <option value="">همه کارکنان</option>
          {(employees?.data || []).map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
        </Select>
        <Select value={fSupervisor} onValueChange={setFSupervisor}>
          <option value="">همه سرپرستان</option>
          {(supervisors?.data || []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {c && (
          <>
            {!hasRole(RoleCode.EMPLOYEE) && !hasRole(RoleCode.EXPERT_L1) && !hasRole(RoleCode.EXPERT_L2) && !hasRole(RoleCode.EXPERT_L3) && (
              <StatCard title="کل کارمندان" value={c.totalEmployees} icon={Users} />
            )}
            <StatCard title="کل تسک‌ها" value={c.totalTasks} icon={ListTodo} />
            <StatCard title="تکمیل‌شده" value={c.completedTasks} icon={CheckCircle2} color="text-success" subtitle={`${toPersianDigits(c.completionRate)}٪`} />
            <StatCard title="به موقع" value={c.onTimeRate ? `${toPersianDigits(c.onTimeRate)}٪` : '—'} icon={TrendingUp} color="text-success" />
            <StatCard title="تأخیر" value={c.delayedTasks} icon={Clock} color="text-destructive" />
            <StatCard title="نیازمند اصلاح" value={c.needRevisionTasks} icon={AlertTriangle} color="text-warning" />
          </>
        )}
        {c && hasRole(RoleCode.SUPER_ADMIN) && (
          <>
            <StatCard title="میانگین کیفیت" value={c.averageQuality != null ? `${toPersianDigits(c.averageQuality)}` : '—'} icon={BarChart3} color="text-primary" />
            <StatCard title="میانگین KPI" value={c.averagePerformance != null ? `${toPersianDigits(c.averagePerformance)}` : '—'} icon={TrendingUp} color="color-emerald" />
            <StatCard title="چک‌لیست روزانه" value={c.dailyChecklistCompletion ? `${toPersianDigits(c.dailyChecklistCompletion)}٪` : '—'} icon={CheckCircle2} />
            <StatCard title="پرونده‌ها" value={c.numberOfCases} icon={Brain} />
            <StatCard title="خطاها" value={c.numberOfErrors} icon={AlertTriangle} color="text-destructive" />
            <StatCard title="آموزش‌ها" value={c.trainingSessions} icon={TrendingUp} />
          </>
        )}
      </div>

      {charts && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="text-base">مقایسه عملکرد کارشناسان</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.employeeComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} />
                  <YAxis tick={{ fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                  <Bar dataKey="completed" name="تکمیل‌شده" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tasks" name="کل تسک‌ها" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">وضعیت تسک‌ها</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {taskStatusChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">روند هفتگی</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartColors.axis }} />
                  <YAxis tick={{ fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="تکمیل" />
                  <Line type="monotone" dataKey="onTime" stroke="#3b82f6" strokeWidth={2} name="به موقع" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">عملکرد پروژه‌ها</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.projectPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" tick={{ fill: chartColors.axis }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                  <Bar dataKey="completed" name="تکمیل‌شده" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="tasks" name="کل" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">وضعیت KPI</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpiPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {kpiPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">روند ماهانه KPI</CardTitle>
              <CardDescription>نرخ اصلاحات: {toPersianDigits(charts.revisionRate)}٪</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: chartColors.axis }} />
                  <YAxis domain={[0, 100]} tick={{ fill: chartColors.axis }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText, border: '1px solid ' + chartColors.grid }} />
                  <Line type="monotone" dataKey="finalScore" stroke="#22c55e" strokeWidth={2} name="KPI" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}