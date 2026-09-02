-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_taskTemplateId_fkey";

-- AlterTable
ALTER TABLE "task_assignments" ALTER COLUMN "taskTemplateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
