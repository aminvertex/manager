-- DropIndex
DROP INDEX "task_assignments_assignedById_idx";

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_dependencies_taskId_idx" ON "task_dependencies"("taskId");

-- CreateIndex
CREATE INDEX "task_dependencies_dependsOn_idx" ON "task_dependencies"("dependsOn");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_taskId_dependsOn_key" ON "task_dependencies"("taskId", "dependsOn");

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependsOn_fkey" FOREIGN KEY ("dependsOn") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
