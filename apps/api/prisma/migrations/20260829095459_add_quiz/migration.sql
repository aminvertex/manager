-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passScore" INTEGER NOT NULL DEFAULT 70,
    "timeMinutes" INTEGER DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_trainingId_key" ON "quizzes"("trainingId");

-- CreateIndex
CREATE INDEX "quizzes_trainingId_idx" ON "quizzes"("trainingId");

-- CreateIndex
CREATE INDEX "quiz_questions_quizId_idx" ON "quiz_questions"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempts_employeeId_idx" ON "quiz_attempts"("employeeId");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
