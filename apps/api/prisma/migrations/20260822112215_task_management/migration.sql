-- CreateTable
CREATE TABLE "task_status_history" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_revisions" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "comment" TEXT,
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "task_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checklists" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_checklists" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION,
    "strengths" TEXT,
    "improvementAreas" TEXT,
    "correctiveActions" TEXT,
    "actionOwner" TEXT,
    "actionDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_evaluations" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "averageScore" DOUBLE PRECISION,
    "score100" DOUBLE PRECISION,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisor_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_controls" (
    "id" TEXT NOT NULL,
    "taskAssignmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "projectId" TEXT,
    "outputType" TEXT,
    "scientificError" BOOLEAN NOT NULL DEFAULT false,
    "calculationError" BOOLEAN NOT NULL DEFAULT false,
    "interpretationError" BOOLEAN NOT NULL DEFAULT false,
    "documentationDefect" BOOLEAN NOT NULL DEFAULT false,
    "writingDefect" BOOLEAN NOT NULL DEFAULT false,
    "protocolViolation" BOOLEAN NOT NULL DEFAULT false,
    "needRevision" BOOLEAN NOT NULL DEFAULT false,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "qualityScore" DOUBLE PRECISION,
    "comment" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychometric_cases" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "assessmentType" TEXT,
    "tool" TEXT,
    "assessmentStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "analysisStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "interpretationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "reportStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "feedbackStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "totalDurationMinutes" INTEGER,
    "needRevision" BOOLEAN NOT NULL DEFAULT false,
    "supervisorApproval" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psychometric_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "instructor" TEXT,
    "durationHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "examScore" DOUBLE PRECISION,
    "supervisorScore" DOUBLE PRECISION,
    "retrainingRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "trainingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "critical_incidents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedById" TEXT,
    "supervisorId" TEXT,
    "resolution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "critical_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_kpis" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "scores" JSONB NOT NULL,
    "weightedScore" DOUBLE PRECISION NOT NULL,
    "classification" TEXT,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_performances" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT,
    "period" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageQuality" DOUBLE PRECISION,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "averageDuration" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_reviews" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "period" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageQuality" DOUBLE PRECISION,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "checklistCompletion" DOUBLE PRECISION,
    "numberOfCases" INTEGER,
    "averageDuration" DOUBLE PRECISION,
    "kpiScore" DOUBLE PRECISION,
    "performanceRank" TEXT,
    "strengths" TEXT,
    "improvementAreas" TEXT,
    "correctiveActions" TEXT,
    "nextMonthPlan" TEXT,
    "finalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_status_history_taskAssignmentId_idx" ON "task_status_history"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "task_status_history_createdAt_idx" ON "task_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "task_comments_taskAssignmentId_idx" ON "task_comments"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "task_attachments_taskAssignmentId_idx" ON "task_attachments"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "task_revisions_taskAssignmentId_idx" ON "task_revisions"("taskAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "task_revisions_taskAssignmentId_revisionNumber_key" ON "task_revisions"("taskAssignmentId", "revisionNumber");

-- CreateIndex
CREATE INDEX "daily_checklists_date_idx" ON "daily_checklists"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checklists_employeeId_date_key" ON "daily_checklists"("employeeId", "date");

-- CreateIndex
CREATE INDEX "weekly_checklists_weekStart_idx" ON "weekly_checklists"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_checklists_employeeId_weekStart_key" ON "weekly_checklists"("employeeId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_evaluations_taskAssignmentId_key" ON "supervisor_evaluations"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "supervisor_evaluations_employeeId_idx" ON "supervisor_evaluations"("employeeId");

-- CreateIndex
CREATE INDEX "supervisor_evaluations_supervisorId_idx" ON "supervisor_evaluations"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_controls_taskAssignmentId_key" ON "quality_controls"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "quality_controls_employeeId_idx" ON "quality_controls"("employeeId");

-- CreateIndex
CREATE INDEX "quality_controls_projectId_idx" ON "quality_controls"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "psychometric_cases_caseCode_key" ON "psychometric_cases"("caseCode");

-- CreateIndex
CREATE INDEX "psychometric_cases_employeeId_idx" ON "psychometric_cases"("employeeId");

-- CreateIndex
CREATE INDEX "psychometric_cases_projectId_idx" ON "psychometric_cases"("projectId");

-- CreateIndex
CREATE INDEX "trainings_employeeId_idx" ON "trainings"("employeeId");

-- CreateIndex
CREATE INDEX "trainings_status_idx" ON "trainings"("status");

-- CreateIndex
CREATE INDEX "critical_incidents_employeeId_idx" ON "critical_incidents"("employeeId");

-- CreateIndex
CREATE INDEX "critical_incidents_severity_idx" ON "critical_incidents"("severity");

-- CreateIndex
CREATE INDEX "employee_kpis_employeeId_idx" ON "employee_kpis"("employeeId");

-- CreateIndex
CREATE INDEX "employee_kpis_period_idx" ON "employee_kpis"("period");

-- CreateIndex
CREATE UNIQUE INDEX "employee_kpis_employeeId_period_periodType_key" ON "employee_kpis"("employeeId", "period", "periodType");

-- CreateIndex
CREATE INDEX "project_performances_projectId_idx" ON "project_performances"("projectId");

-- CreateIndex
CREATE INDEX "project_performances_employeeId_idx" ON "project_performances"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_performances_projectId_employeeId_period_key" ON "project_performances"("projectId", "employeeId", "period");

-- CreateIndex
CREATE INDEX "monthly_reviews_employeeId_idx" ON "monthly_reviews"("employeeId");

-- CreateIndex
CREATE INDEX "monthly_reviews_period_idx" ON "monthly_reviews"("period");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reviews_employeeId_period_key" ON "monthly_reviews"("employeeId", "period");

-- CreateIndex
CREATE INDEX "task_assignments_assignedById_idx" ON "task_assignments"("assignedById");

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_revisions" ADD CONSTRAINT "task_revisions_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checklists" ADD CONSTRAINT "daily_checklists_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_checklists" ADD CONSTRAINT "weekly_checklists_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychometric_cases" ADD CONSTRAINT "psychometric_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
