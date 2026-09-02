-- AlterTable
ALTER TABLE "performance_evaluations" ADD COLUMN     "selfImprovement" TEXT,
ADD COLUMN     "selfScore" DOUBLE PRECISION,
ADD COLUMN     "selfStrengths" TEXT,
ADD COLUMN     "selfSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "projectId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_members" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_rooms_projectId_idx" ON "chat_rooms"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_members_roomId_userId_key" ON "chat_room_members"("roomId", "userId");

-- CreateIndex
CREATE INDEX "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
