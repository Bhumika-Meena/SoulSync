import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  CreateWellnessGoalSchema,
  UpdateWellnessGoalSchema,
  type CreateWellnessGoalDTO,
  type UpdateWellnessGoalDTO,
  type GoalStatus,
} from "@soulsync/contracts";

@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

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

  @Post()
  async createGoal(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Body(new ZodValidationPipe(CreateWellnessGoalSchema))
    body?: CreateWellnessGoalDTO
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const goal = await this.goalsService.createGoal(userId, body!);

    return {
      success: true,
      data: goal,
    };
  }

  @Get()
  async listGoals(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Query("status") status?: GoalStatus
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const goals = await this.goalsService.listGoals(userId, status);

    return {
      success: true,
      data: goals,
    };
  }

  @Get(":id")
  async getGoalById(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const goal = await this.goalsService.getGoalById(userId, id);

    return {
      success: true,
      data: goal,
    };
  }

  @Patch(":id")
  async updateGoal(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Body(new ZodValidationPipe(UpdateWellnessGoalSchema))
    body?: UpdateWellnessGoalDTO
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const updated = await this.goalsService.updateGoal(userId, id, body!);

    return {
      success: true,
      data: updated,
    };
  }
}
