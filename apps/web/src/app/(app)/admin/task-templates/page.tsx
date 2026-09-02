'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Search, FileCheck2, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { TASK_CATEGORIES, INITIAL_PROJECTS } from '@amatis/shared';
import { toPersianDigits } from '@/lib/date';

interface Template {
  id: string;
  taskCode: string;
  name: string;
  category: string;
  description: string | null;
  expectedOutput: string | null;
  standardDurationMinutes: number | null;
  priority: string;
  requiresSupervisorApproval: boolean;
  isActive: boolean;
  project: { name: string } | null;
}

export default function TaskTemplatesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', expectedOutput: '', standardDurationMinutes: 60, priority: 'MEDIUM', projectId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['task-templates', search, category],
    queryFn: () => api.get<{ data: Template[] }>(`/task-templates?search=${search}&category=${category === 'ALL' ? '' : category}`),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-sel'],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string }> }>('/projects?limit=100'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/task-templates', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-templates'] }); setOpen(false); setForm({ name: '', category: '', description: '', expectedOutput: '', standardDurationMinutes: 60, priority: 'MEDIUM', projectId: '' }); toast({ title: 'قالب تسک ایجاد شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/task-templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-templates'] }); toast({ title: 'قالب حذف شد' }); },
    onError: (e) => toast({ title: 'خطا', description: (e as ApiError).message, variant: 'destructive' }),
  });

  const filtered = (data?.data || []).filter((t) => (category === 'ALL' ? true : t.category === category));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">قالب‌های تسک</h1>
          <p className="text-muted-foreground text-sm">بانک تسک‌های استاندارد</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 ml-2" />قالب جدید</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در قالب‌ها..." className="pr-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <option value="ALL">همه دسته‌ها</option>
          {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <FileCheck2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">قالبی یافت نشد</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base line-clamp-1">{t.name}</CardTitle>
                  <Badge variant="outline">{toPersianDigits(t.taskCode.replace('TASK-', ''))}</Badge>
                </div>
                <CardDescription>{t.category} {t.project ? `• ${t.project.name}` : ''}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{t.expectedOutput || t.description || '—'}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>مدت: {t.standardDurationMinutes ? toPersianDigits(t.standardDurationMinutes) + ' دقیقه' : '—'}</span>
                  {t.requiresSupervisorApproval && <Badge className="bg-warning/15 text-warning">نیاز به تأیید</Badge>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="icon" variant="ghost" onClick={() => { /* edit */ }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قالب تسک جدید</DialogTitle>
            <DialogDescription>یک قالب استاندارد به بانک تسک‌ها اضافه کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام تسک *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: اجرای ارزیابی" />
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>مدت استاندارد (دقیقه)</Label>
                <Input type="number" value={form.standardDurationMinutes} onChange={(e) => setForm({ ...form, standardDurationMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>اولویت</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <option value="LOW">کم</option>
                  <option value="MEDIUM">متوسط</option>
                  <option value="HIGH">بالا</option>
                  <option value="URGENT">فوری</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>پروژه</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <option value="">بدون پروژه</option>
                {(projects?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>خروجی مورد انتظار</Label>
              <Textarea value={form.expectedOutput} onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>شرح</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button className="w-full" disabled={!form.name.trim() || !form.category || create.isPending} onClick={() => create.mutate()}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              ایجاد قالب
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
