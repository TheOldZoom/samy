-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "imageMuteRoleId" TEXT,
ADD COLUMN     "jailChannelId" TEXT,
ADD COLUMN     "jailRoleId" TEXT,
ADD COLUMN     "reactionMuteRoleId" TEXT;

-- CreateTable
CREATE TABLE "JailedMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roles" TEXT NOT NULL,
    "reason" TEXT,
    "moderatorId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JailedMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryMute" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvokeMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvokeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JailedMember_guildId_idx" ON "JailedMember"("guildId");

-- CreateIndex
CREATE INDEX "JailedMember_expiresAt_idx" ON "JailedMember"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "JailedMember_guildId_userId_key" ON "JailedMember"("guildId", "userId");

-- CreateIndex
CREATE INDEX "StaffRole_guildId_idx" ON "StaffRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_guildId_roleId_key" ON "StaffRole"("guildId", "roleId");

-- CreateIndex
CREATE INDEX "TemporaryMute_guildId_idx" ON "TemporaryMute"("guildId");

-- CreateIndex
CREATE INDEX "TemporaryMute_expiresAt_idx" ON "TemporaryMute"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryMute_guildId_userId_type_key" ON "TemporaryMute"("guildId", "userId", "type");

-- CreateIndex
CREATE INDEX "InvokeMessage_guildId_idx" ON "InvokeMessage"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "InvokeMessage_guildId_command_type_key" ON "InvokeMessage"("guildId", "command", "type");

-- AddForeignKey
ALTER TABLE "JailedMember" ADD CONSTRAINT "JailedMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryMute" ADD CONSTRAINT "TemporaryMute_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvokeMessage" ADD CONSTRAINT "InvokeMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
