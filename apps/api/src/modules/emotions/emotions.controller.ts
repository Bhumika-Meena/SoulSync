import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";
import { EmotionsService } from "./emotions.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import {
  EmotionTrendsQuerySchema,
  type EmotionTrendsQueryDTO,
} from "@soulsync/contracts";

@Controller("emotions")
export class EmotionsController {
  constructor(private readonly emotionsService: EmotionsService) {}

  @Get("trends")
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(EmotionTrendsQuerySchema))
    query?: EmotionTrendsQueryDTO
  ) {
    const days = query?.days ?? 7;
    const trends = await this.emotionsService.getTrends(user.id, days);

    return {
      success: true,
      data: trends,
    };
  }

  @Get("recent")
  async getRecent(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    const records = await this.emotionsService.getRecent(user.id, parsedLimit);

    return {
      success: true,
      data: records,
    };
  }
}
