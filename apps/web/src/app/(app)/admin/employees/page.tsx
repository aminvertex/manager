"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  Power,
  ShieldCheck,
  Mail,
  Phone,
  Users,
  Briefcase,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton, EmployeeCardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { RoleCode } from "@amatis/types";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/hooks/use-toast";
import { toPersianDigits } from "@/lib/date";
import { useRouter } from "next/navigation";
import { resolveAvatarUrl } from "@/lib/utils";

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position?: string;
  collaborationStatus: string;
  skillLevel?: string;
  gender?: string;
  maritalStatus?: string;
  collaborationType?: string;
  email?: string;
  avatarUrl?: string;
  user: { mobile: string; isActive: boolean; roles?: string[] };
  primaryProject?: { id: string; name: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدیر سیستم",
  CEO: "مدیرعامل",
  EXPERT_L1: "کارشناس سطح یک",
  EXPERT_L2: "کارشناس سطح دو",
  EXPERT_L3: "کارشناس سطح سه",
  TECH_COMMITTEE_MEMBER: "عضو کمیته فنی",
  TECH_COMMITTEE_MANAGER: "مدیر کمیته فنی",
  SALES_CONSULTANT: "مشاور فروش",
  SUPERVISOR: "سرپرست",
};
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).filter(([k]) => k !== 'EMPLOYEE');
const GENDER_LABELS: Record<string, string> = {
  MALE: "مرد",
  FEMALE: "زن",
  OTHER: "سایر",
};
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: "مجرد",
  MARRIED: "متأهل",
  OTHER: "سایر",
};
const COLLAB_LABELS: Record<string, string> = {
  FULL_TIME: "تمام‌وقت",
  PART_TIME: "پاره‌وقت",
  REMOTE: "دورکاری",
  INTERN: "کارآموزی",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/10 text-red-600",
  CEO: "bg-purple-500/10 text-purple-600",
  EXPERT_L1: "bg-blue-500/10 text-blue-600",
  EXPERT_L2: "bg-cyan-500/10 text-cyan-600",
  EXPERT_L3: "bg-emerald-500/10 text-emerald-600",
  TECH_COMMITTEE_MEMBER: "bg-indigo-500/10 text-indigo-600",
  TECH_COMMITTEE_MANAGER: "bg-violet-500/10 text-violet-600",
  SALES_CONSULTANT: "bg-amber-500/10 text-amber-600",
  SUPERVISOR: "bg-teal-500/10 text-teal-600",
  EMPLOYEE: "bg-slate-500/10 text-slate-600",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  mobile: "",
  initialPassword: "",
  roleCode: "",
  primaryProjectId: "",
  gender: "",
  maritalStatus: "",
  collaborationType: "",
  isProjectSupervisor: false,
  email: "",
};

export default function EmployeesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const isAdmin = can("canCreateEmployee") || can("canChangeRole");
  const canManage = isAdmin || hasRole(RoleCode.SUPERVISOR);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search],
    queryFn: () =>
      api.get<{ success: boolean; data: Employee[]; meta: { total: number } }>(
        `/employees?search=${encodeURIComponent(search)}&limit=100`,
      ),
  });

  const { data: projects } = useQuery({
    queryKey: ["emp-projects"],
    queryFn: () =>
      api.get<{ success: boolean; data: Project[] }>("/projects?limit=100"),
  });

  const employees = (data?.data || []).filter(
    (e) => !roleFilter || e.user?.roles?.includes(roleFilter),
  );

  const openCreate = () => {
    setEditEmp(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      mobile: emp.user.mobile,
      initialPassword: "",
      roleCode: "",
      primaryProjectId: emp.primaryProject?.id || "",
      gender: emp.gender || "",
      maritalStatus: emp.maritalStatus || "",
      collaborationType: emp.collaborationType || "",
      isProjectSupervisor: false,
      email: emp.email || "",
    });
    setOpen(true);
  };

  const saveEmployee = useMutation({
    mutationFn: () => {
      const body: any = {};
      if (form.firstName) body.firstName = form.firstName;
      if (form.lastName) body.lastName = form.lastName;
      if (!editEmp) body.mobile = form.mobile;
      if (!editEmp) body.initialPassword = form.initialPassword;
      if (form.roleCode) body.roleCode = form.roleCode;
      if (form.gender) body.gender = form.gender;
      if (form.maritalStatus) body.maritalStatus = form.maritalStatus;
      if (form.collaborationType)
        body.collaborationType = form.collaborationType;
      if (form.email && form.email.includes("@")) body.email = form.email;
      if (editEmp) return api.patch(`/employees/${editEmp.id}`, body);
      return api.post("/employees", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      toast({ title: editEmp ? "کارمند ویرایش شد" : "کارمند ایجاد شد" });
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) =>
      api.patch(`/employees/${id}/role`, { roleCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "نقش تغییر کرد" });
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.patch(`/employees/${id}/toggle-active`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "وضعیت تغییر کرد" });
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post(`/employees/${id}/reset-password`, { newPassword }),
    onSuccess: () => toast({ title: "رمز عبور بازنشانی شد" }),
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  const removeEmp = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "کارمند حذف شد" });
    },
    onError: (e) =>
      toast({
        title: "خطا",
        description: (e as ApiError).message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-violet-600 bg-clip-text text-transparent">
            مدیریت کارمندان
          </h1>
          <p className="text-muted-foreground">
            {toPersianDigits(data?.meta?.total ?? 0)} کارمند در سیستم
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="h-4 w-4" /> ایجاد کارمند
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجوی نام، کد یا موبایل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={setRoleFilter}
          className="max-w-[200px]"
        >
          <option value="">همه نقش‌ها</option>
          {ROLE_OPTIONS.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EmployeeCardSkeleton key={i} />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-dashed p-14 text-center text-muted-foreground">
          کارمندی یافت نشد
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {employees.map((emp, i) => {
              const role = emp.user?.roles?.[0] || "";
              return (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex items-center gap-3 text-right"
                      onClick={() => router.push(`/admin/employees/${emp.id}`)}
                    >
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white font-bold text-lg overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                          {emp.avatarUrl ? (
                            <img
                              src={resolveAvatarUrl(emp.avatarUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-1 -left-1 h-4 w-4 rounded-full border-2 border-card ${emp.user.isActive ? "bg-green-500" : "bg-gray-400"}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate group-hover:text-primary transition-colors">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {emp.employeeCode}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="ویرایش"
                            onClick={() => openEdit(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="فعال/غیرفعال"
                            onClick={() => toggleActive.mutate(emp.id)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            title="حذف"
                            onClick={() => setDeleteTarget(emp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${ROLE_COLORS[role] || "bg-muted text-muted-foreground"}`}
                    >
                      <ShieldCheck className="h-3 w-3 ml-1" />{" "}
                      {ROLE_LABELS[role] || role}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${emp.user.isActive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}
                    >
                      {emp.user.isActive ? "فعال" : "غیرفعال"}
                    </span>
                    {emp.primaryProject && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-blue-500/10 text-blue-600">
                        <Briefcase className="h-3 w-3 ml-1" />{" "}
                        {emp.primaryProject.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span dir="ltr" className="truncate">
                        {emp.user.mobile}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{emp.email || "—"}</span>
                    </div>
                    {emp.gender && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{GENDER_LABELS[emp.gender] || emp.gender}</span>
                      </div>
                    )}
                    {emp.collaborationType && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {COLLAB_LABELS[emp.collaborationType] ||
                            emp.collaborationType}
                        </span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      {isAdmin ? (
                        <Select
                          value={role}
                          onValueChange={(v) =>
                            changeRole.mutate({ id: emp.id, roleCode: v })
                          }
                          className="h-8 text-xs max-w-[140px]"
                        >
                          {ROLE_OPTIONS.map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => {
                          setResetTarget(emp);
                          setResetPasswordValue("");
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5 ml-1" /> بازنشانی رمز
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editEmp ? "ویرایش کارمند" : "ایجاد کارمند جدید"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نام *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>نام خانوادگی</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            {!editEmp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>موبایل *</Label>
                  <Input
                    value={form.mobile}
                    onChange={(e) =>
                      setForm({ ...form, mobile: e.target.value })
                    }
                    placeholder="0912..."
                  />
                </div>
                <div>
                  <Label>رمز اولیه *</Label>
                  <Input
                    type="password"
                    value={form.initialPassword}
                    onChange={(e) =>
                      setForm({ ...form, initialPassword: e.target.value })
                    }
                    placeholder="حداقل ۸ کاراکتر"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نقش</Label>
                <Select
                  value={form.roleCode}
                  onValueChange={(v) => setForm({ ...form, roleCode: v })}
                >
                  <option value="">انتخاب نقش...</option>
                  {ROLE_OPTIONS.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>جنسیت</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <option value="">انتخاب...</option>
                  {Object.entries(GENDER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>وضعیت تأهل</Label>
                <Select
                  value={form.maritalStatus}
                  onValueChange={(v) => setForm({ ...form, maritalStatus: v })}
                >
                  <option value="">انتخاب...</option>
                  {Object.entries(MARITAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>نوع همکاری</Label>
                <Select
                  value={form.collaborationType}
                  onValueChange={(v) =>
                    setForm({ ...form, collaborationType: v })
                  }
                >
                  <option value="">انتخاب...</option>
                  {Object.entries(COLLAB_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>ایمیل</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={
                saveEmployee.isPending ||
                (editEmp
                  ? !form.firstName
                  : !form.firstName || !form.mobile || !form.initialPassword)
              }
              onClick={() => saveEmployee.mutate()}
            >
              {saveEmployee.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {editEmp ? "ذخیره تغییرات" : "ایجاد کارمند"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`حذف ${deleteTarget?.firstName} ${deleteTarget?.lastName}`}
        description="آیا از حذف این کارمند مطمئن هستید؟ این عملیات قابل بازگشت نیست."
        onConfirm={() => deleteTarget && removeEmp.mutate(deleteTarget.id)}
      />

      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-warning" /> بازنشانی رمز عبور
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              رمز جدید برای {resetTarget?.firstName} {resetTarget?.lastName}
            </p>
            <div>
              <Label>رمز عبور جدید</Label>
              <Input
                className="mt-2"
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="حداقل ۸ کاراکتر"
              />
            </div>
            <div className="flex gap-2 justify-start">
              <Button
                disabled={
                  resetPasswordValue.length < 8 || resetPassword.isPending
                }
                onClick={() => {
                  if (resetTarget)
                    resetPassword.mutate({
                      id: resetTarget.id,
                      newPassword: resetPasswordValue,
                    });
                  setResetTarget(null);
                  setResetPasswordValue("");
                }}
              >
                {resetPassword.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                بازنشانی رمز
              </Button>
              <Button variant="ghost" onClick={() => setResetTarget(null)}>
                انصراف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
