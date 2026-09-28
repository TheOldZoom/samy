/*
  Warnings:

  - A unique constraint covering the columns `[userId,commandKey]` on the table `DailyUsage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyUsage_userId_commandKey_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_commandKey_key" ON "DailyUsage"("userId", "commandKey");
