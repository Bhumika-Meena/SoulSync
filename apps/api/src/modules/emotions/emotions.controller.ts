import {
  Controller,
  Get,
  Query,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { EmotionsService } from "./emotions.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  EmotionTrendsQuerySchema,
  type EmotionTrendsQueryDTO,
} from "@soulsync/contracts";

@Controller("emotions")
export class EmotionsController {
  constructor(private readonly emotionsService: EmotionsService) {}

  private extractUserId(headerUserId?: string, queryUserId?: string): string {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException({
        code: "USER_ID_REQUIRED",
        message: "User context is required via x-user-id header or userId query parameter",
      });
    }
    return userId;
  }

  @Get("trends")
  async getTrends(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Query(new ZodValidationPipe(EmotionTrendsQuerySchema))
    query?: EmotionTrendsQueryDTO
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const days = query?.days ?? 7;
    const trends = await this.emotionsService.getTrends(userId, days);

    return {
      success: true,
      data: trends,
    };
  }

  @Get("recent")
  async getRecent(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Query("limit") limit?: string
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    const records = await this.emotionsService.getRecent(userId, parsedLimit);

    return {
      success: true,
      data: records,
    };
  }
}
