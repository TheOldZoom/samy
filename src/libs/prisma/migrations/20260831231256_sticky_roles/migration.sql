-- CreateTable
CREATE TABLE "StickyRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StickyRole_guildId_idx" ON "StickyRole"("guildId");

-- CreateIndex
CREATE INDEX "StickyRole_guildId_userId_idx" ON "StickyRole"("guildId", "userId");

-- CreateIndex
CREATE INDEX "StickyRole_roleId_idx" ON "StickyRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "StickyRole_guildId_userId_roleId_key" ON "StickyRole"("guildId", "userId", "roleId");

-- CreateIndex
CREATE INDEX "TemporaryRole_expiresAt_idx" ON "TemporaryRole"("expiresAt");

-- CreateIndex
CREATE INDEX "TemporaryRole_guildId_idx" ON "TemporaryRole"("guildId");

-- CreateIndex
CREATE INDEX "TemporaryRole_guildId_userId_idx" ON "TemporaryRole"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryRole_guildId_userId_roleId_key" ON "TemporaryRole"("guildId", "userId", "roleId");

-- AddForeignKey
ALTER TABLE "StickyRole" ADD CONSTRAINT "StickyRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryRole" ADD CONSTRAINT "TemporaryRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
