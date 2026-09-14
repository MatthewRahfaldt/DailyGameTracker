-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_gameResultId_idx" ON "Reaction"("gameResultId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_gameResultId_userId_emoji_key" ON "Reaction"("gameResultId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
