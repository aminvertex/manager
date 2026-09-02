import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  DEFAULT_KPI_WEIGHTS,
  DEFAULT_PERFORMANCE_CLASSIFICATIONS,
  TASK_CATEGORIES,
  INITIAL_PROJECTS,
} from "@amatis/shared";

const prisma = new PrismaClient();

const ROLES = [
  { code: "SUPER_ADMIN", name: "مدیر سیستم", description: "دسترسی کامل" },
  { code: "CEO", name: "مدیرعامل", description: "داشبورد مدیریتی" },
  { code: "EXPERT_L1", name: "کارشناس سطح یک", description: "کارشناس سطح یک" },
  { code: "EXPERT_L2", name: "کارشناس سطح دو", description: "کارشناس سطح دو" },
  { code: "EXPERT_L3", name: "کارشناس سطح سه", description: "کارشناس سطح سه" },
  { code: "TECH_COMMITTEE_MEMBER", name: "عضو کمیته فنی", description: "عضو کمیته فنی" },
  { code: "TECH_COMMITTEE_MANAGER", name: "مدیر کمیته فنی", description: "مدیر کمیته فنی" },
  { code: "SALES_CONSULTANT", name: "مشاور فروش", description: "مشاور فروش" },
  { code: "SUPERVISOR", name: "سرپرست", description: "مدیریت تیم (legacy)" },
  { code: "EMPLOYEE", name: "کارشناس", description: "کارشناس روانشناسی (legacy)" },
];

const PRIORITIES = [
  { code: "LOW", label: "کم", color: "gray" },
  { code: "MEDIUM", label: "متوسط", color: "blue" },
  { code: "HIGH", label: "بالا", color: "orange" },
  { code: "URGENT", label: "فوری", color: "red" },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: role,
      update: { name: role.name, description: role.description },
    });
  }
  console.log("✅ Roles seeded");

  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((r) => [r.code, r.id]));

  // Settings
  const settings = [
    {
      key: "task_categories",
      value: TASK_CATEGORIES,
      category: "tasks",
      label: "دسته‌بندی تسک‌ها",
    },
    {
      key: "priorities",
      value: PRIORITIES,
      category: "tasks",
      label: "اولویت‌ها",
    },
    {
      key: "kpi_weights",
      value: DEFAULT_KPI_WEIGHTS,
      category: "kpi",
      label: "وزن KPI",
    },
    {
      key: "performance_classifications",
      value: DEFAULT_PERFORMANCE_CLASSIFICATIONS,
      category: "kpi",
      label: "طبقه‌بندی عملکرد",
    },
    {
      key: "critical_incident_penalty",
      value: {
        basePenalty: 10,
        severityMultipliers: {
          LOW: 0.5,
          MEDIUM: 1.0,
          HIGH: 1.5,
          CRITICAL: 2.0,
        },
      },
      category: "kpi",
      label: "جریمه حادثه بحرانی",
    },
  ];

  for (const setting of settings) {
    const jsonValue = JSON.parse(JSON.stringify(setting.value));

    await prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: jsonValue,
        category: setting.category,
        label: setting.label,
      },
      update: {
        value: jsonValue,
      },
    });
  }
  // for (const setting of settings) {
  //   await prisma.setting.upsert({
  //     where: { key: setting.key },
  //     create: setting,
  //     update: { value: setting.value },
  //   });
  // }
  console.log("✅ Settings seeded");

  // Projects
  const projects: Record<string, string> = {};
  for (const proj of INITIAL_PROJECTS) {
    const project = await prisma.project.upsert({
      where: { code: proj.code },
      create: { name: proj.name, code: proj.code, status: "ACTIVE" },
      update: { name: proj.name },
    });
    projects[proj.code] = project.id;
  }
  console.log("✅ Projects seeded");

  // Demo Users
  const demoUsers = [
    {
      mobile: "09120000001",
      password: "Admin@123456",
      role: "SUPER_ADMIN",
      profile: {
        firstName: "مدیر",
        lastName: "سیستم",
        employeeCode: "EMP-0001",
        position: "مدیر فنی",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000002",
      password: "Executive@123456",
      role: "CEO",
      profile: {
        firstName: "مدیر",
        lastName: "عامل",
        employeeCode: "EMP-0002",
        position: "مدیرعامل",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000003",
      password: "Supervisor@123456",
      role: "SUPERVISOR",
      profile: {
        firstName: "سرپرست",
        lastName: "اول",
        employeeCode: "EMP-0003",
        position: "سرپرست ارزیابی",
        primaryProjectId: projects["ASSESS-PSY"],
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000004",
      password: "Employee@123456",
      role: "EMPLOYEE",
      profile: {
        firstName: "کارشناس",
        lastName: "اول",
        employeeCode: "EMP-0004",
        position: "کارشناس روانشناسی",
        primaryProjectId: projects["IND-PSY"],
        skillLevel: "MID",
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000005",
      password: "Employee@123456",
      role: "EMPLOYEE",
      profile: {
        firstName: "کارشناس",
        lastName: "دوم",
        employeeCode: "EMP-0005",
        position: "کارشناس روانشناسی",
        primaryProjectId: projects["EKSEIR-DEL"],
        skillLevel: "JUNIOR",
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000006",
      password: "Employee@123456",
      role: "EMPLOYEE",
      profile: {
        firstName: "کارشناس",
        lastName: "سوم",
        employeeCode: "EMP-0006",
        position: "کارشناس روانشناسی",
        primaryProjectId: projects["BAMBOO"],
        skillLevel: "SENIOR",
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000007",
      password: "Supervisor@123456",
      role: "SUPERVISOR",
      profile: {
        firstName: "سرپرست",
        lastName: "دوم",
        employeeCode: "EMP-0007",
        position: "سرپرست آموزش",
        primaryProjectId: projects["TRAINING"],
        mustChangePassword: false,
      },
    },
    // New roles
    {
      mobile: "09120000008",
      password: "Expert@123456",
      role: "EXPERT_L1",
      profile: {
        firstName: "کارشناس",
        lastName: "سطح یک",
        employeeCode: "EMP-0008",
        primaryProjectId: projects["RND"],
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000009",
      password: "Expert@123456",
      role: "EXPERT_L2",
      profile: {
        firstName: "کارشناس",
        lastName: "سطح دو",
        employeeCode: "EMP-0009",
        primaryProjectId: projects["IND-PSY"],
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000010",
      password: "Expert@123456",
      role: "EXPERT_L3",
      profile: {
        firstName: "کارشناس",
        lastName: "سطح سه",
        employeeCode: "EMP-0010",
        primaryProjectId: projects["ASSESS-PSY"],
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000011",
      password: "Tech@123456",
      role: "TECH_COMMITTEE_MEMBER",
      profile: {
        firstName: "عضو",
        lastName: "کمیته فنی",
        employeeCode: "EMP-0011",
        primaryProjectId: projects["RND"],
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000012",
      password: "Tech@123456",
      role: "TECH_COMMITTEE_MANAGER",
      profile: {
        firstName: "مدیر",
        lastName: "کمیته فنی",
        employeeCode: "EMP-0012",
        primaryProjectId: projects["RND"],
        collaborationType: "FULL_TIME",
        mustChangePassword: false,
      },
    },
    {
      mobile: "09120000013",
      password: "Sales@123456",
      role: "SALES_CONSULTANT",
      profile: {
        firstName: "مشاور",
        lastName: "فروش",
        employeeCode: "EMP-0013",
        primaryProjectId: projects["OTHER"],
        collaborationType: "PART_TIME",
        mustChangePassword: false,
      },
    },
  ];

  const employeeIds: Record<string, string> = {};

  for (const demo of demoUsers) {
    const passwordHash = await hashPassword(demo.password);

    const user = await prisma.user.upsert({
      where: { mobile: demo.mobile },
      create: {
        mobile: demo.mobile,
        passwordHash,
        mustChangePassword: demo.profile.mustChangePassword,
        isActive: true,
        userRoles: { create: { roleId: roleMap[demo.role] } },
      },
      update: { passwordHash },
    });

    const employee = await prisma.employeeProfile.upsert({
      where: { employeeCode: demo.profile.employeeCode },
      create: {
        userId: user.id,
        employeeCode: demo.profile.employeeCode,
        firstName: demo.profile.firstName,
        lastName: demo.profile.lastName,
        position: demo.profile.position,
        primaryProjectId: demo.profile.primaryProjectId,
        skillLevel: demo.profile.skillLevel,
        collaborationType: demo.profile.collaborationType,
        startDate: new Date("2024-01-01"),
      },
      update: {
        firstName: demo.profile.firstName,
        lastName: demo.profile.lastName,
        userId: user.id,
      },
    });

    employeeIds[demo.profile.employeeCode] = employee.id;
  }

  // Assign supervisors
  await prisma.employeeProfile.update({
    where: { id: employeeIds["EMP-0004"] },
    data: { supervisorId: employeeIds["EMP-0003"] },
  });
  await prisma.employeeProfile.update({
    where: { id: employeeIds["EMP-0005"] },
    data: { supervisorId: employeeIds["EMP-0003"] },
  });
  await prisma.employeeProfile.update({
    where: { id: employeeIds["EMP-0006"] },
    data: { supervisorId: employeeIds["EMP-0007"] },
  });

  // Task Templates - 4 Week Standard Program
  const TASK_TEMPLATES = [
    // Week 1 - Standardization
    { name: "مطالعه فرآیند خدمات روانشناسی", category: "آموزش", week: 1 },
    { name: "مطالعه پروتکل ارزیابی", category: "آموزش", week: 1 },
    { name: "مرور اصول اخلاق حرفه‌ای", category: "آموزش", week: 1 },
    { name: "مرور فرآیند اجرای تست", category: "آموزش", week: 1 },
    { name: "مرور فرآیند تحلیل", category: "تحلیل و تفسیر", week: 1 },
    { name: "بررسی نمونه گزارش", category: "گزارش‌نویسی", week: 1 },
    { name: "بررسی نمونه فیدبک", category: "فیدبک به مراجع", week: 1 },
    { name: "بررسی نمونه نقشه راه", category: "طراحی نقشه راه", week: 1 },
    { name: "تهیه گزارش تمرینی", category: "گزارش‌نویسی", week: 1 },
    { name: "دریافت فیدبک", category: "آموزش", week: 1 },
    { name: "اصلاح گزارش", category: "گزارش‌نویسی", week: 1 },
    // Week 2 - Assessment & Psychometrics
    { name: "بررسی پرونده", category: "کنترل پرونده", week: 2 },
    { name: "بررسی کامل بودن اطلاعات", category: "کنترل پرونده", week: 2 },
    { name: "انتخاب ابزار مناسب", category: "ارزیابی و روان‌سنجی", week: 2 },
    { name: "اجرای ارزیابی", category: "ارزیابی و روان‌سنجی", week: 2 },
    { name: "کنترل کیفیت داده", category: "ارزیابی و روان‌سنجی", week: 2 },
    { name: "تحلیل اولیه", category: "تحلیل و تفسیر", week: 2 },
    { name: "ثبت نتایج", category: "مستندسازی", week: 2 },
    { name: "تهیه خلاصه روان‌سنجی", category: "گزارش‌نویسی", week: 2 },
    { name: "ارسال برای کنترل سرپرست", category: "امور سازمانی", week: 2 },
    // Week 3 - Analysis & Feedback
    { name: "تحلیل نتایج", category: "تحلیل و تفسیر", week: 3 },
    { name: "استخراج نقاط قوت", category: "تحلیل و تفسیر", week: 3 },
    { name: "شناسایی چالش‌ها", category: "تحلیل و تفسیر", week: 3 },
    { name: "شناسایی الگوهای تکرارشونده", category: "تحلیل و تفسیر", week: 3 },
    { name: "تحلیل نیازهای مراجع", category: "تحلیل و تفسیر", week: 3 },
    { name: "تدوین پیشنهاد رشد", category: "تحلیل و تفسیر", week: 3 },
    { name: "طراحی نقشه راه", category: "طراحی نقشه راه", week: 3 },
    { name: "آماده‌سازی فیدبک", category: "فیدبک به مراجع", week: 3 },
    { name: "اجرای فیدبک", category: "فیدبک به مراجع", week: 3 },
    { name: "ثبت گزارش", category: "گزارش‌نویسی", week: 3 },
    { name: "تعیین Follow-up", category: "پیگیری مراجع", week: 3 },
    // Week 4 - Continuous Improvement
    { name: "بررسی پرونده‌های تکمیل‌شده", category: "کنترل پرونده", week: 4 },
    { name: "شناسایی خطاهای پرتکرار", category: "تحلیل و تفسیر", week: 4 },
    { name: "پیشنهاد اصلاح فرآیند", category: "امور سازمانی", week: 4 },
    { name: "تکمیل بانک دانش", category: "مستندسازی", week: 4 },
    { name: "مطالعه منابع تخصصی", category: "آموزش", week: 4 },
    { name: "Case Study", category: "آموزش", week: 4 },
    { name: "سوپرویژن", category: "آموزش", week: 4 },
    { name: "ارزیابی عملکرد ماهانه", category: "امور سازمانی", week: 4 },
    { name: "برنامه‌ریزی ماه بعد", category: "امور سازمانی", week: 4 },
  ];

  const weeks: string[] = [];
  let tCount = await prisma.taskTemplate.count();
  for (const t of TASK_TEMPLATES) {
    tCount++;
    const taskCode = `TASK-${String(tCount).padStart(4, "0")}`;
    const weekLabel = `WEEK-${t.week}`;
    if (!weeks.includes(weekLabel)) weeks.push(weekLabel);
    await prisma.taskTemplate.upsert({
      where: { taskCode },
      create: {
        taskCode,
        name: t.name,
        category: t.category,
        expectedOutput: t.week === 1
          ? "یک پرونده کامل شبیه‌سازی‌شده از ارزیابی تا نقشه راه"
          : t.week === 4
          ? "گزارش بهبود فرآیند و برنامه ماه بعد"
          : "خروجی ثبت‌شده در سیستم",
        standardDurationMinutes: 60,
        priority: "MEDIUM",
        frequency: weekLabel,
        requiresSupervisorApproval: ["WEEK-2", "WEEK-3"].includes(weekLabel) && ["ارسال برای کنترل سرپرست"].includes(t.name),
      },
      update: {},
    });
  }
  console.log(`✅ ${TASK_TEMPLATES.length} Task templates seeded (${weeks.join(", ")})`);

  // Demo task assignments for employees with realistic statuses
  const templateList = await prisma.taskTemplate.findMany({ take: 12, orderBy: { createdAt: "asc" } });
  const empIds = [employeeIds["EMP-0004"], employeeIds["EMP-0005"], employeeIds["EMP-0006"]];
  const projectsList = await prisma.project.findMany({ take: 3 });
  let aCount = await prisma.taskAssignment.count();
  const statuses = ["APPROVED", "APPROVED", "IN_PROGRESS", "DELAYED", "NEED_REVISION", "APPROVED"];

  for (let i = 0; i < 18; i++) {
    const template = templateList[i % templateList.length];
    const employeeId = empIds[i % empIds.length];
    const project = projectsList[i % projectsList.length];
    const status = statuses[i % statuses.length];
    aCount++;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() - (i % 5));
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - (i % 5) - 1);
    const isCompleted = status === "APPROVED";
    const completionTime = isCompleted ? new Date(startTime.getTime() + 3*24*3600*1000) : null;

    await prisma.taskAssignment.create({
      data: {
        assignmentCode: `ASN-${String(aCount).padStart(5, "0")}`,
        taskTemplateId: template.id,
        employeeId,
        projectId: project.id,
        assignedById: employeeIds["EMP-0003"],
        status,
        progress: isCompleted ? 100 : status === "IN_PROGRESS" ? 50 : 0,
        priority: "MEDIUM",
        deadline,
        startTime,
        completionTime,
        actualDurationMinutes: isCompleted ? 300 : undefined,
        revisionCount: status === "NEED_REVISION" ? 1 : 0,
        qualityScore: isCompleted ? 85 + (i % 10) : undefined,
        supervisorScore: isCompleted ? 4 + (i % 2) : undefined,
        isDelayed: status === "DELAYED" || (!isCompleted && new Date() > deadline),
        delayDays: status === "DELAYED" || (!isCompleted && new Date() > deadline) ? 2 : 0,
      },
    });
  }
  console.log("✅ 18 demo task assignments seeded");

  console.log("");
  console.log("📋 Demo Accounts:");
  console.log("  Admin:      09120000001 / Admin@123456");
  console.log("  Executive:  09120000002 / Executive@123456");
  console.log("  Supervisor: 09120000003 / Supervisor@123456");
  console.log("  Employee:   09120000004 / Employee@123456");
  console.log("");
  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
