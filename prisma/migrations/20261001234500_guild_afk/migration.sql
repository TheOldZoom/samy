ALTER TABLE "User" DROP COLUMN "afkReason";
ALTER TABLE "User" DROP COLUMN "afkSince";

CREATE TABLE "AfkStatus" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AfkStatus_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE INDEX "AfkStatus_userId_idx" ON "AfkStatus"("userId");

ALTER TABLE "AfkStatus" ADD CONSTRAINT "AfkStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
