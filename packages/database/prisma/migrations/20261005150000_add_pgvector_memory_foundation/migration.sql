-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "MemorySourceType" AS ENUM ('JOURNAL_ENTRY', 'GOAL', 'SUMMARY');

-- CreateTable
CREATE TABLE "MemoryEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "MemorySourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryEmbedding_userId_sourceType_idx" ON "MemoryEmbedding"("userId", "sourceType");

-- CreateIndex
CREATE INDEX "MemoryEmbedding_userId_createdAt_idx" ON "MemoryEmbedding"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MemoryEmbedding_embedding_hnsw_idx" ON "MemoryEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "MemoryEmbedding" ADD CONSTRAINT "MemoryEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
