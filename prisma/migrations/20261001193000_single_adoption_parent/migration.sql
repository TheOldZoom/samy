DELETE FROM "Adoption" AS duplicate
USING "Adoption" AS keeper
WHERE duplicate."childId" = keeper."childId"
  AND (
    duplicate."createdAt" > keeper."createdAt"
    OR (
      duplicate."createdAt" = keeper."createdAt"
      AND duplicate.ctid > keeper.ctid
    )
  );

DROP INDEX "Adoption_childId_idx";
CREATE UNIQUE INDEX "Adoption_childId_key" ON "Adoption"("childId");
