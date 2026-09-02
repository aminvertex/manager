-- CreateTable
CREATE TABLE "task_projects" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "task_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_projects_projectId_idx" ON "task_projects"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "task_projects_taskId_projectId_key" ON "task_projects"("taskId", "projectId");

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
