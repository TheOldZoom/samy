-- CreateTable
CREATE TABLE "AfkMention" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentionerId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AfkMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AfkMention_guildId_userId_idx" ON "AfkMention"("guildId", "userId");
