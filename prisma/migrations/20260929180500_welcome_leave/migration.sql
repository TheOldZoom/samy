CREATE TABLE "Welcome" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "Welcome_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Welcome_guildId_channelId_key" ON "Welcome"("guildId", "channelId");
CREATE UNIQUE INDEX "Leave_guildId_channelId_key" ON "Leave"("guildId", "channelId");
