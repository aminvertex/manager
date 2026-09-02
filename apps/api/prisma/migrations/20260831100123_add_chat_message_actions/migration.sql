-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;
