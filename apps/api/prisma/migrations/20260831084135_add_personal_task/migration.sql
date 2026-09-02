-- AlterTable
ALTER TABLE "task_assignments" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false;
