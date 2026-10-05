import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type {
  CreateWellnessGoalDTO,
  UpdateWellnessGoalDTO,
  GoalStatus,
} from "@soulsync/contracts";

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new wellness goal.
   */
  async createGoal(userId: string, dto: CreateWellnessGoalDTO) {
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;

    return this.prisma.wellnessGoal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        targetDate,
        status: dto.status ?? "PENDING_APPROVAL",
      },
    });
  }

  /**
   * List goals for a user, optionally filtered by status.
   */
  async listGoals(userId: string, status?: GoalStatus) {
    return this.prisma.wellnessGoal.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieve a single goal by ID for a user.
   */
  async getGoalById(userId: string, goalId: string) {
    const goal = await this.prisma.wellnessGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new NotFoundException({
        code: "GOAL_NOT_FOUND",
        message: `Wellness goal with ID ${goalId} not found`,
      });
    }

    return goal;
  }

  /**
   * Update a wellness goal.
   */
  async updateGoal(userId: string, goalId: string, dto: UpdateWellnessGoalDTO) {
    await this.getGoalById(userId, goalId);

    const targetDate =
      dto.targetDate !== undefined
        ? dto.targetDate
          ? new Date(dto.targetDate)
          : null
        : undefined;

    return this.prisma.wellnessGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(targetDate !== undefined ? { targetDate } : {}),
      },
    });
  }
}
