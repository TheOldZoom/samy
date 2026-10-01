ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

INSERT INTO "User" ("id", "username")
SELECT "userId", "userId" FROM "MarriageMember"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "User" ("id", "username")
SELECT "parentId", "parentId" FROM "Adoption"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "User" ("id", "username")
SELECT "childId", "childId" FROM "Adoption"
ON CONFLICT ("id") DO NOTHING;

UPDATE "User" SET "username" = "id" WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "MarriageMember" ADD CONSTRAINT "MarriageMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Adoption" ADD CONSTRAINT "Adoption_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Adoption" ADD CONSTRAINT "Adoption_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
