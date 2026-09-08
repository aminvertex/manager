'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Trash2, Plus, Clock, Tag } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { RoleCode } from '@amatis/types';
import { toast } from '@/hooks/use-toast';

interface Setting {
  id: string;
  key: string;
  value: unknown;
  category: string;
  label?: string;
}

interface KpiWeights {
  accuracy: number;
  learning: number;
  teamwork: number;
  productivity: number;
  documentation: number;
  onTimeDelivery: number;
  responsibility: number;
  processCompliance: number;
  scientificQuality: number;
}

const KPI_LABELS: Record<string, string> = {
  accuracy: 'دقت',
  learning: 'یادگیری',
  teamwork: 'کار تیمی',
  productivity: 'بهره‌وری',
  documentation: 'مستندسازی',
  onTimeDelivery: 'تحویل به‌موقع',
  responsibility: 'مسئولیت‌پذیری',
  processCompliance: 'انطباق فرآیندی',
  scientificQuality: 'کیفیت علمی',
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(RoleCode.SUPER_ADMIN) || hasRole(RoleCode.CEO) || hasRole(RoleCode.TECH_COMMITTEE_MANAGER);

  const { data: weights, isLoading: wLoading } = useQuery({
    queryKey: ['settings-kpi'],
    queryFn: () => api.get<KpiWeights>('/settings/kpi-weights'),
  });

  const [form, setForm] = useState<KpiWeights | null>(null);
  const current = form ?? weights;

  const save = useMutation({
    mutationFn: () => api.put('/settings/kpi_weights', { value: current, category: 'kpi' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-kpi'] }); toast({ title: 'وزن‌های KPI ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  interface Classification { minScore: number; maxScore: number; label: string; color: string }
  const { data: classifications } = useQuery({
    queryKey: ['settings-classifications'],
    queryFn: () => api.get<{ success: boolean; data: Classification[] }>('/settings/performance-classifications'),
  });
  const [classForm, setClassForm] = useState<Classification[] | null>(null);
  const classCurrent = classForm ?? (classifications?.data || []);
  const saveClass = useMutation({
    mutationFn: () => api.put('/settings/performance_classifications', { value: classCurrent, category: 'kpi', label: 'کلاس‌های عملکرد' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-classifications'] }); toast({ title: 'Threshold ها ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const { data: schedulerData } = useQuery({
    queryKey: ['settings-scheduler'],
    queryFn: () => api.get<{ success: boolean; data: { value: any } | null }>('/settings/scheduler_settings').then((r) => r.data).catch(() => null),
  });
  const [schedulerForm, setSchedulerForm] = useState<{ checklistReminderHour?: number; delayWarningHour?: number }>({});
  const schedulerCurrent = Object.keys(schedulerForm).length ? schedulerForm : (schedulerData?.value || {});
  const saveScheduler = useMutation({
    mutationFn: () => api.put('/settings/scheduler_settings', { value: schedulerCurrent, category: 'general', label: 'زمان‌بندی یادآوری‌ها' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-scheduler'] }); toast({ title: 'زمان‌بندی ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  type ChecklistSchedule = {
    dailyStartHour: number; dailyEndHour: number; dailyEndMinute: number;
    weeklyStartDay: number; weeklyStartHour: number; weeklyEndDay: number; weeklyEndHour: number; weeklyEndMinute: number;
  };
  const { data: checklistSchedule } = useQuery({
    queryKey: ['settings-checklist-schedule'],
    queryFn: () => api.get<ChecklistSchedule>('/checklists/schedule'),
  });
  const [checklistForm, setChecklistForm] = useState<Partial<ChecklistSchedule>>({});
  const checklistCurrent = { ...checklistSchedule, ...checklistForm } as ChecklistSchedule;
  const saveChecklistSchedule = useMutation({
    mutationFn: () => api.put('/settings/checklist_schedule', { value: checklistCurrent, category: 'general', label: 'زمان‌بندی چک‌لیست‌ها' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-checklist-schedule'] }); toast({ title: 'زمان‌بندی چک‌لیست‌ها ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'مدیر سیستم', CEO: 'مدیرعامل',
    EXPERT_L1: 'کارشناس سطح یک', EXPERT_L2: 'کارشناس سطح دو', EXPERT_L3: 'کارشناس سطح سه',
    TECH_COMMITTEE_MEMBER: 'عضو کمیته فنی', TECH_COMMITTEE_MANAGER: 'مدیر کمیته فنی',
    SALES_CONSULTANT: 'مشاور فروش', SUPERVISOR: 'سرپرست', EMPLOYEE: 'کارشناس',
  };
  const { data: idPatterns } = useQuery({ queryKey: ['settings-idpatterns'], queryFn: () => api.get<any>('/settings/id-patterns') });
  const [idForm, setIdForm] = useState<any>(null);
  const idCurrent = idForm ?? idPatterns?.data ?? { employeePrefix: 'STE', projectPrefix: 'PRJ', rolePrefixes: {} };
  const saveIdPatterns = useMutation({
    mutationFn: () => api.put('/settings/id-patterns', { ...idCurrent, category: 'general' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-idpatterns'] }); toast({ title: 'الگوی شناسه‌ها ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const { data: settings, isLoading: sLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ success: boolean; data: Setting[] }>('/settings'),
  });
  const { data: categorySetting } = useQuery({
    queryKey: ['settings-task-categories'],
    queryFn: () => api.get<{ success: boolean; data: { value: string[] } | null }>('/settings/task_categories'),
  });
  const [categoryForm, setCategoryForm] = useState<string[] | null>(null);
  const categories = categoryForm ?? categorySetting?.data?.value ?? [];
  const saveCategories = useMutation({
    mutationFn: () => api.put('/settings/task_categories', { value: categories, category: 'tasks', label: 'دسته‌بندی تسک‌ها' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-task-categories'] }); toast({ title: 'دسته‌بندی‌ها ذخیره شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const grouped = (settings?.data || []).reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, Setting[]>);

  const categoryLabels: Record<string, string> = { tasks: 'تسک‌ها', kpi: 'KPI', general: 'عمومی' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات سیستم</h1>
        <p className="text-muted-foreground">مدیریت فرمول‌ها و پیکربندی سیستم</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرمول KPI — وزن شاخص‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {wLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {Object.entries(KPI_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="min-w-[130px]">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!isAdmin}
                    value={current?.[key as keyof KpiWeights] ?? 0}
                    onChange={(e) => setForm({ ...(current as KpiWeights), [key]: Number(e.target.value) })}
                    className="max-w-[120px]"
                  />
                  <span className="text-xs text-muted-foreground">٪</span>
                </div>
              ))}
              {isAdmin && (
                <Button onClick={() => save.mutate()} disabled={!form}>
                  <Save className="h-4 w-4 ml-2" /> ذخیره وزن‌ها
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">دسته‌بندی تسک‌ها</CardTitle><CardDescription>این موارد در فرم ایجاد تسک نمایش داده می‌شوند.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {categories.map((item, index) => <div key={`${item}-${index}`} className="flex gap-2"><Input value={item} disabled={!isAdmin} onChange={(e) => { const next = [...categories]; next[index] = e.target.value; setCategoryForm(next); }} /><Button variant="ghost" size="icon" disabled={!isAdmin} onClick={() => setCategoryForm(categories.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
          {isAdmin && <div className="flex gap-2"><Button variant="outline" onClick={() => setCategoryForm([...categories, 'دسته‌بندی جدید'])}><Plus className="h-4 w-4 ml-1" />افزودن</Button><Button onClick={() => saveCategories.mutate()}><Save className="h-4 w-4 ml-1" />ذخیره</Button></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> پنجره ثبت چک‌لیست‌ها</CardTitle>
          <CardDescription>ساعت شروع و پایان ثبت روزانه و هفتگی را تعیین کنید. روزها از ۰ یکشنبه تا ۶ شنبه هستند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>شروع روزانه</Label><Input type="number" min={0} max={23} disabled={!isAdmin} value={checklistCurrent.dailyStartHour ?? 0} onChange={(e) => setChecklistForm({ ...checklistCurrent, dailyStartHour: Number(e.target.value) })} /></div>
            <div><Label>ساعت پایان روزانه</Label><Input type="number" min={0} max={23} disabled={!isAdmin} value={checklistCurrent.dailyEndHour ?? 23} onChange={(e) => setChecklistForm({ ...checklistCurrent, dailyEndHour: Number(e.target.value) })} /></div>
            <div><Label>دقیقه پایان روزانه</Label><Input type="number" min={0} max={59} disabled={!isAdmin} value={checklistCurrent.dailyEndMinute ?? 50} onChange={(e) => setChecklistForm({ ...checklistCurrent, dailyEndMinute: Number(e.target.value) })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            <div><Label>روز شروع هفتگی</Label><Input type="number" min={0} max={6} disabled={!isAdmin} value={checklistCurrent.weeklyStartDay ?? 4} onChange={(e) => setChecklistForm({ ...checklistCurrent, weeklyStartDay: Number(e.target.value) })} /></div>
            <div><Label>ساعت شروع</Label><Input type="number" min={0} max={23} disabled={!isAdmin} value={checklistCurrent.weeklyStartHour ?? 8} onChange={(e) => setChecklistForm({ ...checklistCurrent, weeklyStartHour: Number(e.target.value) })} /></div>
            <div><Label>روز پایان هفتگی</Label><Input type="number" min={0} max={6} disabled={!isAdmin} value={checklistCurrent.weeklyEndDay ?? 5} onChange={(e) => setChecklistForm({ ...checklistCurrent, weeklyEndDay: Number(e.target.value) })} /></div>
            <div><Label>ساعت پایان</Label><Input type="number" min={0} max={23} disabled={!isAdmin} value={checklistCurrent.weeklyEndHour ?? 23} onChange={(e) => setChecklistForm({ ...checklistCurrent, weeklyEndHour: Number(e.target.value) })} /></div>
            <div><Label>دقیقه پایان</Label><Input type="number" min={0} max={59} disabled={!isAdmin} value={checklistCurrent.weeklyEndMinute ?? 50} onChange={(e) => setChecklistForm({ ...checklistCurrent, weeklyEndMinute: Number(e.target.value) })} /></div>
          </div>
          {isAdmin && <Button onClick={() => saveChecklistSchedule.mutate()}><Save className="h-4 w-4 ml-2" /> ذخیره زمان‌بندی چک‌لیست</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Threshold عملکرد (کلاس‌های KPI)</CardTitle>
          <CardDescription>محدوده نمره و برچسب هر سطح عملکرد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {classCurrent.map((c, i) => (
            <div key={i} className="flex items-center gap-3 border rounded-lg p-3">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div><Label className="text-xs">از</Label><Input type="number" value={c.minScore} onChange={(e) => { const nc = [...classCurrent]; nc[i] = { ...nc[i], minScore: Number(e.target.value) }; setClassForm(nc); }} disabled={!isAdmin} className="h-9 text-xs" /></div>
                <div><Label className="text-xs">تا</Label><Input type="number" value={c.maxScore} onChange={(e) => { const nc = [...classCurrent]; nc[i] = { ...nc[i], maxScore: Number(e.target.value) }; setClassForm(nc); }} disabled={!isAdmin} className="h-9 text-xs" /></div>
                <div><Label className="text-xs">برچسب</Label><Input value={c.label} onChange={(e) => { const nc = [...classCurrent]; nc[i] = { ...nc[i], label: e.target.value }; setClassForm(nc); }} disabled={!isAdmin} className="h-9 text-xs" /></div>
              </div>
              <span className={`h-4 w-4 rounded-full shrink-0 ${c.color === 'green' ? 'bg-success' : c.color === 'yellow' ? 'bg-warning' : 'bg-destructive'}`} />
              {isAdmin && (
                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => { const nc = classCurrent.filter((_, x) => x !== i); setClassForm(nc); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setClassForm([...classCurrent, { minScore: 0, maxScore: 0, label: 'کلاس جدید', color: 'yellow' }])}>
                <Plus className="h-4 w-4 ml-1" /> افزودن کلاس
              </Button>
              <Button onClick={() => saveClass.mutate()} disabled={!classForm}>
                <Save className="h-4 w-4 ml-2" /> ذخیره Threshold ها
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> زمان‌بندی یادآوری‌های خودکار</CardTitle>
          <CardDescription>ساعت اجرای یادآوری چک‌لیست روزانه و هشدار تسک دیرکرد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedulerData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ساعت یادآوری چک‌لیست</Label>
                <Input type="number" min={0} max={23} disabled={!isAdmin} value={schedulerForm.checklistReminderHour ?? 8} onChange={(e) => setSchedulerForm({ ...schedulerForm, checklistReminderHour: Number(e.target.value) })} />
              </div>
              <div>
                <Label>ساعت هشدار تسک دیرکرد</Label>
                <Input type="number" min={0} max={23} disabled={!isAdmin} value={schedulerForm.delayWarningHour ?? 9} onChange={(e) => setSchedulerForm({ ...schedulerForm, delayWarningHour: Number(e.target.value) })} />
              </div>
            </div>
          )}
          {isAdmin && (
            <Button onClick={() => saveScheduler.mutate()}><Save className="h-4 w-4 ml-2" /> ذخیره زمان‌بندی</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> الگوی شناسه‌ها</CardTitle>
          <CardDescription>تعیین پیشوند کد پروژه و کد کارکنان بر اساس نقش</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>پیشوند کد پروژه</Label>
              <Input disabled={!isAdmin} value={idCurrent.projectPrefix || 'PRJ'} onChange={(e) => setIdForm({ ...idCurrent, projectPrefix: e.target.value })} />
            </div>
            <div>
              <Label>پیشوند پیش‌فرض کارمند</Label>
              <Input disabled={!isAdmin} value={idCurrent.employeePrefix || 'STE'} onChange={(e) => setIdForm({ ...idCurrent, employeePrefix: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>پیشوند بر اساس نقش</Label>
            {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([role, label]) => (
              <div key={role} className="flex items-center gap-2">
                <span className="text-xs min-w-[120px]">{label}</span>
                <Input disabled={!isAdmin} value={idCurrent.rolePrefixes?.[role] || ''} onChange={(e) => setIdForm({ ...idCurrent, rolePrefixes: { ...idCurrent.rolePrefixes, [role]: e.target.value } })} placeholder={idCurrent.employeePrefix || 'STE'} className="h-8 text-xs" />
              </div>
            ))}
          </div>
          {isAdmin && <Button onClick={() => saveIdPatterns.mutate()}><Save className="h-4 w-4 ml-2" /> ذخیره الگو</Button>}
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-lg font-semibold">{categoryLabels[category] || category}</h2>
          <div className="grid gap-3">
            {items.map((setting) => (
              <Card key={setting.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{setting.label || setting.key}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 text-left" dir="ltr">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}