CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "durationMs" BIGINT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MemberNote" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ModerationConfig" (
    "guildId" TEXT NOT NULL,
    "imageMuteRoleId" TEXT,
    "reactionMuteRoleId" TEXT,
    "jailRoleId" TEXT,
    "jailChannelId" TEXT,

    CONSTRAINT "ModerationConfig_pkey" PRIMARY KEY ("guildId")
);
CREATE TABLE "TemporaryAction" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roleId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryAction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TemporaryBan" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryBan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Lockdown" (
    "guildId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Lockdown_pkey" PRIMARY KEY ("guildId")
);
CREATE TABLE "LockdownChannel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockdownChannel_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LockdownRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockdownRole_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModerationCase_guildId_userId_createdAt_idx" ON "ModerationCase"("guildId", "userId", "createdAt");
CREATE UNIQUE INDEX "ModerationCase_guildId_number_key" ON "ModerationCase"("guildId", "number");
CREATE INDEX "Warning_guildId_userId_createdAt_idx" ON "Warning"("guildId", "userId", "createdAt");
CREATE INDEX "MemberNote_guildId_userId_createdAt_idx" ON "MemberNote"("guildId", "userId", "createdAt");
CREATE INDEX "TemporaryAction_expiresAt_idx" ON "TemporaryAction"("expiresAt");
CREATE UNIQUE INDEX "TemporaryAction_guildId_userId_type_key" ON "TemporaryAction"("guildId", "userId", "type");
CREATE INDEX "TemporaryBan_expiresAt_idx" ON "TemporaryBan"("expiresAt");
CREATE UNIQUE INDEX "TemporaryBan_guildId_userId_key" ON "TemporaryBan"("guildId", "userId");
CREATE UNIQUE INDEX "LockdownChannel_guildId_channelId_key" ON "LockdownChannel"("guildId", "channelId");
CREATE UNIQUE INDEX "LockdownRole_guildId_roleId_key" ON "LockdownRole"("guildId", "roleId");
