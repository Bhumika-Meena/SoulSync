import { Controller, Get, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  MemorySearchQuerySchema,
  type MemorySearchQueryDTO,
} from "@soulsync/contracts";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get("search")
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(MemorySearchQuerySchema)) query: MemorySearchQueryDTO
  ) {
    const results = await this.memoryService.search(user.id, query.query, {
      limit: query.limit,
      minSimilarity: query.minSimilarity,
      sourceType: query.sourceType,
    });

    return {
      success: true,
      data: results,
    };
  }
}
