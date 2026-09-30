-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "mentionLinksEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);
