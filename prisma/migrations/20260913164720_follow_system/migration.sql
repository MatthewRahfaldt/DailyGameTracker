-- Add followCode in three steps: Prisma's @default(cuid()) is client-side, so a
-- straight NOT NULL UNIQUE add would fail against existing User rows.
ALTER TABLE "User" ADD COLUMN "followCode" TEXT;
UPDATE "User" SET "followCode" = gen_random_uuid()::text WHERE "followCode" IS NULL;
ALTER TABLE "User" ALTER COLUMN "followCode" SET NOT NULL;
CREATE UNIQUE INDEX "User_followCode_key" ON "User"("followCode");

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- Prisma cannot express CHECK constraints; this enforces "no self-follow" in the database.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_no_self_follow" CHECK ("followerId" <> "followingId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
