'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { getInitials, resolveAvatarUrl } from '@/lib/utils';
import { toJalaliDate } from '@/lib/date';
import { api } from '@/lib/api';
import { Mail, Save, Pencil, KeyRound, Building2, UserRound, Camera, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر سیستم',
  CEO: 'مدیرعامل',
  EXPERT_L1: 'کارشناس سطح یک',
  EXPERT_L2: 'کارشناس سطح دو',
  EXPERT_L3: 'کارشناس سطح سه',
  TECH_COMMITTEE_MEMBER: 'عضو کمیته فنی',
  TECH_COMMITTEE_MANAGER: 'مدیر کمیته فنی',
  SALES_CONSULTANT: 'مشاور فروش',
  SUPERVISOR: 'سرپرست',
  EMPLOYEE: 'کارشناس',
};
const GENDER_LABELS: Record<string, string> = { MALE: 'مرد', FEMALE: 'زن', OTHER: 'سایر' };
const MARITAL_LABELS: Record<string, string> = { SINGLE: 'مجرد', MARRIED: 'متأهل', OTHER: 'سایر' };
const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'تمام‌وقت', PART_TIME: 'پاره‌وقت', REMOTE: 'دورکاری', INTERN: 'کارآموز', CONTRACT: 'قراردادی',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const profile = user?.employeeProfile;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: profile?.firstName || '', lastName: profile?.lastName || '',
    email: profile?.email || '', age: profile?.age || '', gender: profile?.gender || '', maritalStatus: profile?.maritalStatus || '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = useMutation({
    mutationFn: (body: any) => api.patch(`/employees/${profile?.id}`, body),
    onSuccess: async () => {
      setEditing(false);
      await refreshUser();
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/employees/${profile?.id}/avatar`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!res.ok) throw new Error('خطا در آپلود عکس');
      await refreshUser();
      qc.invalidateQueries({ queryKey: ['auth'] });
      toast({ title: 'عکس پروفایل به‌روزرسانی شد' });
    } catch (e) {
      toast({ title: 'خطا', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">پروفایل</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">اطلاعات پروفایل یافت نشد</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">پروفایل</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold overflow-hidden">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveAvatarUrl(profile.avatarUrl)} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profile.firstName, profile.lastName)
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="تغییر عکس پروفایل"
                >
                  {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = '';
                  }}
                />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {profile.firstName} {profile.lastName}
                  <Badge variant="secondary">{ROLE_LABELS[user?.roles?.[0] || ''] || user?.roles?.[0]}</Badge>
                </CardTitle>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {profile.position || 'بدون سمت'}
                </p>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" onClick={() => { setEditing(true); setForm({ firstName: profile.firstName || '', lastName: profile.lastName || '', email: profile.email || '', age: profile.age || '', gender: profile.gender || '', maritalStatus: profile.maritalStatus || '' }); }}>
                <Pencil className="h-4 w-4 ml-2" /> ویرایش
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>نام</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><Label>نام خانوادگی</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div><Label>ایمیل</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@mail.com" /></div>
                <div><Label>سن</Label><Input type="number" value={form.age || ''} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /></div>
                <div><Label>جنسیت</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <option value="">انتخاب...</option>
                    {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div><Label>وضعیت تأهل</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v })}>
                    <option value="">انتخاب...</option>
                    {Object.entries(MARITAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveProfile.mutate(form)} disabled={saveProfile.isPending}>
                  <Save className="h-4 w-4 ml-2" /> ذخیره تغییرات
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <InfoField icon={<UserRound className="h-4 w-4" />} label="کد پرسنلی" value={profile.employeeCode} />
              <InfoField label="شماره موبایل" value={user?.mobile} />
              <InfoField icon={<Mail className="h-4 w-4" />} label="ایمیل" value={profile.email || '—'} />
              <InfoField label="سن" value={profile.age ? String(profile.age) : '—'} />
              <InfoField label="جنسیت" value={GENDER_LABELS[profile.gender || ''] || profile.gender || '—'} />
              <InfoField label="وضعیت تأهل" value={MARITAL_LABELS[profile.maritalStatus || ''] || profile.maritalStatus || '—'} />
              <InfoField label="نوع همکاری" value={TYPE_LABELS[profile.collaborationType || ''] || profile.collaborationType || '—'} />
              <InfoField label="تاریخ استخدام" value={toJalaliDate(profile.startDate)} />
              {profile.supervisor && <InfoField label="سرپرست" value={`${profile.supervisor.firstName} ${profile.supervisor.lastName}`} />}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">تغییر رمز عبور</p>
              <p className="text-xs text-muted-foreground">برای امنیت حساب خود رمز را به‌صورت دوره‌ای تغییر دهید</p>
            </div>
          </div>
          <Link href="/change-password">
            <Button variant="outline">تغییر رمز</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </span>
      <p className="font-medium mt-1">{value || '—'}</p>
    </div>
  );
}