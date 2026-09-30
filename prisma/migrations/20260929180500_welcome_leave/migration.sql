-- CreateTable
CREATE TABLE "Welcome" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "Welcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Welcome_guildId_channelId_key" ON "Welcome"("guildId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Leave_guildId_channelId_key" ON "Leave"("guildId", "channelId");
