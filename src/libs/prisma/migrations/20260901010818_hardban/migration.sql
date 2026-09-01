-- CreateTable
CREATE TABLE "HardBan" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HardBan_guildId_idx" ON "HardBan"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "HardBan_guildId_userId_key" ON "HardBan"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "HardBan" ADD CONSTRAINT "HardBan_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
