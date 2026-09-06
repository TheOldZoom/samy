-- CreateTable
CREATE TABLE "BotEventSetting" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "event" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BotEventSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotEventSetting_guildId_idx" ON "BotEventSetting"("guildId");

-- CreateIndex
CREATE INDEX "BotEventSetting_event_idx" ON "BotEventSetting"("event");

-- CreateIndex
CREATE UNIQUE INDEX "BotEventSetting_guildId_channelId_event_key" ON "BotEventSetting"("guildId", "channelId", "event");

-- AddForeignKey
ALTER TABLE "BotEventSetting" ADD CONSTRAINT "BotEventSetting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
