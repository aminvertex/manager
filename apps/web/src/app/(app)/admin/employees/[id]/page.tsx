"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowRight,
  Users,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toJalaliDate, toPersianDigits } from "@/lib/date";
import { resolveAvatarUrl } from "@/lib/utils";

interface EmpDetail {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  age: number | null;
  position?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  startDate?: string | null;
  collaborationStatus?: string;
  collaborationType?: string;
  skillLevel?: string | null;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  primaryProject?: { id: string; name: string; code: string };
  projectMembers?: Array<{
    project: { id: string; name: string; code: string };
  }>;
  user: {
    mobile: string;
    isActive: boolean;
    userRoles?: Array<{ role: { code: string } }>;
  };
}

const SKILL_LABELS: Record<string, string> = {
  JUNIOR: "مبتدی",
  MID: "متوسط",
  SENIOR: "ارشد",
  EXPERT: "خبره",
};
const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "تمام‌وقت",
  PART_TIME: "پاره‌وقت",
  CONTRACT: "قراردادی",
  INTERN: "کارآموز",
};
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدیر سیستم",
  CEO: "مدیر فنی",
  SUPERVISOR: "سرپرست",
  EMPLOYEE: "کارشناس",
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get<{ data: EmpDetail }>(`/employees/${id}`),
  });

  const { data: tasks } = useQuery({
    queryKey: ["emp-tasks", id],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: Array<{
          status: string;
          progress: number;
          deadline: string | null;
          taskTemplate: { name: string };
        }>;
      }>(`/tasks?limit=200&employeeId=${id}`),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!data?.data)
    return (
      <Card className="p-8 text-center text-destructive">کارمند یافت نشد</Card>
    );

  const e = data.data;
  const role = e.user?.userRoles?.[0]?.role?.code;
  const all = tasks?.data || [];
  const completed = all.filter((t) => t.status === "APPROVED").length;
  const delayed = all.filter((t) => t.status === "DELAYED").length;
  const inProgress = all.filter((t) =>
    ["IN_PROGRESS", "SUBMITTED", "NEED_REVISION"].includes(t.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold overflow-hidden">
            {e.avatarUrl ? (
              <img
                src={resolveAvatarUrl(e.avatarUrl)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {e.firstName} {e.lastName}
              <Badge variant="outline">
                {ROLE_LABELS[role || ""] || role || "—"}
              </Badge>
            </h1>
            {/* <p className="text-muted-foreground">
              {e.employeeCode} • {e.user.mobile}
            </p> */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">کل تسک‌ها</p>
            <p className="text-2xl font-bold">{toPersianDigits(all.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">تکمیل‌شده</p>
            <p className="text-2xl font-bold text-success">
              {toPersianDigits(completed)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">در حال انجام</p>
            <p className="text-2xl font-bold text-blue-600">
              {toPersianDigits(inProgress)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">عقب‌افتاده</p>
            <p className="text-2xl font-bold text-destructive">
              {toPersianDigits(delayed)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات فردی</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">سن:</span>
              <p className="font-medium">
                {e.age ? toPersianDigits(e.age) : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">ایمیل:</span>
              <p className="font-medium">{e.email || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">موبایل:</span>
              <p className="font-medium" dir="rtl">
                {e.user.mobile}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">نوع همکاری:</span>
              <p className="font-medium">
                {TYPE_LABELS[e.collaborationType || ""] ||
                  e.collaborationType ||
                  "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">تاریخ شروع:</span>
              <p className="font-medium">{toJalaliDate(e.startDate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> پروژه‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {e.primaryProject && (
              <div className="rounded-lg border p-3">
                <p className="font-medium">
                  پروژه اصلی: {e.primaryProject.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.primaryProject.code}
                </p>
              </div>
            )}
            {(e.projectMembers || []).map((m) => (
              <div key={m.project.id} className="rounded-lg border p-3">
                <p className="font-medium">{m.project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.project.code}
                </p>
              </div>
            ))}
            {!e.primaryProject && (e.projectMembers || []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                کارمند در پروژه‌ای عضو نیست
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> تسک‌های کارمند
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {all.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              تسکی ثبت نشده است
            </p>
          ) : (
            all.slice(0, 10).map((t) => (
              <div
                key={t.taskTemplate.name + t.deadline}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{t.taskTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    مهلت: {toJalaliDate(t.deadline)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {toPersianDigits(t.progress)}٪
                  </Badge>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${t.status === "APPROVED" ? "bg-success/15 text-success" : t.status === "DELAYED" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
                  >
                    {t.status === "APPROVED"
                      ? "تأیید شده"
                      : t.status === "DELAYED"
                        ? "عقب افتاده"
                        : "در جریان"}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
