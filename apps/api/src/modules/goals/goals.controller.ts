import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
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

  @Post()
  async createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateWellnessGoalSchema))
    body?: CreateWellnessGoalDTO
  ) {
    const goal = await this.goalsService.createGoal(user.id, body!);

    return {
      success: true,
      data: goal,
    };
  }

  @Get()
  async listGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: GoalStatus
  ) {
    const goals = await this.goalsService.listGoals(user.id, status);

    return {
      success: true,
      data: goals,
    };
  }

  @Get(":id")
  async getGoalById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const goal = await this.goalsService.getGoalById(user.id, id);

    return {
      success: true,
      data: goal,
    };
  }

  @Patch(":id")
  async updateGoal(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateWellnessGoalSchema))
    body?: UpdateWellnessGoalDTO
  ) {
    const updated = await this.goalsService.updateGoal(user.id, id, body!);

    return {
      success: true,
      data: updated,
    };
  }
}
