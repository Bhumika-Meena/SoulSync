import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MemoryService } from "../memory/memory.service";
import type {
  CreateWellnessGoalDTO,
  UpdateWellnessGoalDTO,
  GoalStatus,
} from "@soulsync/contracts";

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService
  ) {}

  /**
   * Create a new wellness goal.
   * Automatically ingests goal title and description into semantic memory.
   */
  async createGoal(userId: string, dto: CreateWellnessGoalDTO) {
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;

    const goal = await this.prisma.wellnessGoal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        targetDate,
        status: dto.status ?? "PENDING_APPROVAL",
      },
    });

    // Automated Memory Ingestion:
    // Prepare content from goal title and description and store embedding
    const content = dto.description
      ? `Goal: ${dto.title}. Description: ${dto.description}`
      : `Goal: ${dto.title}`;

    await this.memoryService
      .store(userId, {
        sourceType: "GOAL",
        sourceId: goal.id,
        content,
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to auto-ingest memory embedding for goal ${goal.id}: ${err}`
        );
      });

    return goal;
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
   * Refreshes memory embedding if title or description was modified.
   */
  async updateGoal(userId: string, goalId: string, dto: UpdateWellnessGoalDTO) {
    await this.getGoalById(userId, goalId);

    const targetDate =
      dto.targetDate !== undefined
        ? dto.targetDate
          ? new Date(dto.targetDate)
          : null
        : undefined;

    const updated = await this.prisma.wellnessGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(targetDate !== undefined ? { targetDate } : {}),
      },
    });

    if (dto.title !== undefined || dto.description !== undefined) {
      const content = updated.description
        ? `Goal: ${updated.title}. Description: ${updated.description}`
        : `Goal: ${updated.title}`;

      await this.memoryService
        .store(userId, {
          sourceType: "GOAL",
          sourceId: goalId,
          content,
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to update memory embedding for goal ${goalId}: ${err}`
          );
        });
    }

    return updated;
  }
}
