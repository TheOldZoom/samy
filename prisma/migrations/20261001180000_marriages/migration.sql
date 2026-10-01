CREATE TABLE "Marriage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarriageMember" (
    "userId" TEXT NOT NULL,
    "marriageId" TEXT NOT NULL,

    CONSTRAINT "MarriageMember_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "Marriage_createdAt_idx" ON "Marriage"("createdAt");
CREATE INDEX "MarriageMember_marriageId_idx" ON "MarriageMember"("marriageId");
ALTER TABLE "MarriageMember" ADD CONSTRAINT "MarriageMember_marriageId_fkey" FOREIGN KEY ("marriageId") REFERENCES "Marriage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
