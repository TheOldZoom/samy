CREATE TABLE "Adoption" (
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adoption_pkey" PRIMARY KEY ("parentId", "childId")
);

CREATE INDEX "Adoption_childId_idx" ON "Adoption"("childId");
