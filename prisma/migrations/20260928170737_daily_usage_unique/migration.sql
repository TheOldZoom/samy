DROP INDEX "DailyUsage_userId_commandKey_idx";
CREATE UNIQUE INDEX "DailyUsage_userId_commandKey_key" ON "DailyUsage"("userId", "commandKey");
