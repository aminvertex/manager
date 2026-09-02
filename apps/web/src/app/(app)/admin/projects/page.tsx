"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  FolderKanban,
  Users,
  CalendarDays,
  UserCircle2,
  Loader2,
  Sparkles,
  Camera,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { RoleCode } from "@amatis/types";
import { toast } from "@/hooks/use-toast";
import { toPersianDigits, toJalaliDate } from "@/lib/date";
import { useRouter } from "next/navigation";
import { resolveAvatarUrl } from "@/lib/utils";

const resolveUrl = resolveAvatarUrl;

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
  description?: string;
  logoUrl?: string;
  startDate?: string | null;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
  _count: { members: number; primaryEmployees: number };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
}

const emptyForm = { name: "", description: "", managerId: "" };

export default function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage =
    hasRole(RoleCode.SUPER_ADMIN) ||
    hasRole(RoleCode.CEO);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) => {
      const fd = new FormData();
      fd.append("logo", file);
      const token = localStorage.getItem("accessToken");
      return fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4041/api/v1"}/projects/${projectId}/logo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () =>
      toast({ title: "خطا در آپلود لوگو", variant: "destructive" }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      api.get<{ success: boolean; data: Project[]; meta: { total: number } }>(
        "/projects?limit=50",
      ),
  });

  const { data: supervisors } = useQuery({
    queryKey: ["proj-supervisors"],
    queryFn: () =>
      api.get<{ success: boolean; data: Employee[] }>(
        "/employees?limit=100&roleCode=SUPERVISOR",
      ),
  });

  const projects = data?.data || [];

  const create = useMutation({
    mutationFn: () =>
      api.post("/projects", { ...form, startDate: new Date().toISOString() }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "پروژه ایجاد شد" });
      if (logoFile && data?.data?.id)
        uploadLogo.mutate({ projectId: data.data.id, file: logoFile });
      setLogoFile(null);
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/projects/${edit?.id}`, {
        name: form.name,
        description: form.description,
        managerId: form.managerId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setEdit(null);
      toast({ title: "پروژه به‌روزرسانی شد" });
      if (logoFile && edit?.id)
        uploadLogo.mutate({ projectId: edit.id, file: logoFile });
      setLogoFile(null);
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "پروژه حذف شد" });
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const openCreate = () => {
    setEdit(null);
    setForm(emptyForm);
    setLogoFile(null);
    setOpen(true);
  };
  const openEdit = (p: Project) => {
    setEdit(p);
    setForm({
      name: p.name,
      description: p.description || "",
      managerId: p.managerId || "",
    });
    setLogoFile(null);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-violet-600 bg-clip-text text-transparent">
            پروژه‌ها
          </h1>
          <p className="text-muted-foreground">
            {toPersianDigits(data?.meta?.total ?? 0)} پروژه فعال
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="h-4 w-4" /> پروژه جدید
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-14 text-center text-muted-foreground">
          پروژه‌ای یافت نشد
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => router.push(`/admin/projects/${p.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-violet-600/10 blur-xl group-hover:from-primary/20 group-hover:to-violet-600/20 transition-all" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                        {p.logoUrl ? (
                          <img
                            src={resolveUrl(p.logoUrl)}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FolderKanban className="h-6 w-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </p>
                        <p
                          className="text-xs text-muted-foreground font-mono"
                          dir="ltr"
                        >
                          {p.code}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${p.isActive ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"}`}
                    >
                      {p.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </div>

                  {p.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {toPersianDigits(p._count.members)}
                      </span>{" "}
                      عضو
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5">
                      <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.manager
                        ? `${p.manager.firstName} ${p.manager.lastName}`
                        : "بدون سرپرست"}
                    </span>
                    {p.startDate && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {toJalaliDate(p.startDate)}
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <div
                      className="mt-3 pt-3 border-t flex justify-between items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => router.push(`/admin/projects/${p.id}`)}
                      >
                        جزئیات
                      </Button>
                      {canManage && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {edit ? (
                "ویرایش پروژه"
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" /> پروژه جدید
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!edit && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                کد پروژه به‌صورت خودکار از الگوی تنظیم‌شده در تنظیمات (مثلاً
                PRJ-001) ساخته می‌شود.
              </div>
            )}
            <div>
              <Label>لوگوی پروژه</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-violet-600/20 overflow-hidden border">
                  {logoFile ? (
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt="logo"
                      className="h-full w-full object-cover"
                    />
                  ) : edit?.logoUrl ? (
                    <img
                      src={resolveUrl(edit.logoUrl)}
                      alt="logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FolderKanban className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 ml-1" /> انتخاب لوگو
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setLogoFile(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                  {logoFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {logoFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label>نام پروژه *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {!edit && (
              <div>
                <Label>تاریخ شروع</Label>
                <Input
                  value={toJalaliDate(new Date().toISOString())}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  تاریخ شروع امروز به‌صورت خودکار تنظیم شد
                </p>
              </div>
            )}
            <div>
              <Label>توضیحات</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>سرپرست پروژه *</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm({ ...form, managerId: v })}
              >
                <option value="">انتخاب سرپرست...</option>
                {(supervisors?.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!form.name || (edit ? false : false)}
              onClick={() => (edit ? update : create).mutate()}
            >
              {edit ? "ذخیره تغییرات" : "ایجاد پروژه"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`حذف پروژه ${deleteTarget?.name}`}
        description="آیا از حذف این پروژه مطمئن هستید؟ این عملیات قابل بازگشت نیست."
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
