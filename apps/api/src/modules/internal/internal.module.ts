import { Module } from "@nestjs/common";
import { InternalController } from "./internal.controller";
import { InternalToolsService } from "./internal-tools.service";
import { InternalHmacGuard } from "../../common/guards/internal-hmac.guard";
import { JournalModule } from "../journal/journal.module";
import { EmotionsModule } from "../emotions/emotions.module";
import { MemoryModule } from "../memory/memory.module";
import { GoalsModule } from "../goals/goals.module";

@Module({
  imports: [JournalModule, EmotionsModule, MemoryModule, GoalsModule],
  controllers: [InternalController],
  providers: [InternalToolsService, InternalHmacGuard],
  exports: [InternalToolsService],
})
export class InternalModule {}
