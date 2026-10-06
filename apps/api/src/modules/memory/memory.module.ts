import { Module } from "@nestjs/common";
import { MemoryService } from "./memory.service";
import { EmbeddingService } from "./embedding.service";
import { MemoryController } from "./memory.controller";

@Module({
  controllers: [MemoryController],
  providers: [MemoryService, EmbeddingService],
  exports: [MemoryService, EmbeddingService],
})
export class MemoryModule {}
