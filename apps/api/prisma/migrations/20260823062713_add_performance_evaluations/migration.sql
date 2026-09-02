-- CreateTable
CREATE TABLE "performance_evaluations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "supervisorId" TEXT,
    "period" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT,
    "improvementAreas" TEXT,
    "correctiveActions" TEXT,
    "notes" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_evaluations_employeeId_idx" ON "performance_evaluations"("employeeId");

-- CreateIndex
CREATE INDEX "performance_evaluations_projectId_idx" ON "performance_evaluations"("projectId");

-- CreateIndex
CREATE INDEX "performance_evaluations_supervisorId_idx" ON "performance_evaluations"("supervisorId");

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
