import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JournalService } from "../journal/journal.service";
import { EmotionsService } from "../emotions/emotions.service";
import { MemoryService } from "../memory/memory.service";
import { GoalsService } from "../goals/goals.service";
import type {
  InternalToolName,
  InternalToolExecutionResponseDTO,
} from "@soulsync/contracts";

@Injectable()
export class InternalToolsService {
  private readonly logger = new Logger(InternalToolsService.name);

  constructor(
    private readonly journalService: JournalService,
    private readonly emotionsService: EmotionsService,
    private readonly memoryService: MemoryService,
    private readonly goalsService: GoalsService
  ) {}

  /**
   * Execute an authorized internal agent tool for a specific verified user.
   */
  async executeTool(
    tool: InternalToolName,
    userId: string,
    payload: Record<string, unknown>
  ): Promise<InternalToolExecutionResponseDTO> {
    this.logger.log(`Executing tool '${tool}' for user '${userId}'`);

    switch (tool) {
      case "get_recent_journal_entries": {
        const limit = typeof payload.limit === "number" ? Math.min(Math.max(payload.limit, 1), 20) : 5;
        const result = await this.journalService.listEntries(userId, {
          limit,
          page: 1,
        });
        return {
          success: true,
          data: {
            entries: result.entries.map((e) => ({
              id: e.id,
              content: e.plainText || e.content,
              createdAt: e.createdAt,
              emotions: e.emotionAnalyses?.map((a) => ({
                emotion: a.primaryEmotion,
                intensity: a.intensity,
              })),
            })),
            total: result.pagination.total,
          },
        };
      }

      case "get_emotion_trends": {
        const days = typeof payload.days === "number" ? Math.min(Math.max(payload.days, 1), 30) : 7;
        const trends = await this.emotionsService.getTrends(userId, days);
        return {
          success: true,
          data: trends,
        };
      }

      case "search_memory": {
        const query = (payload.query || payload.q) as string | undefined;
        if (!query || typeof query !== "string" || query.trim().length === 0) {
          throw new BadRequestException("Query string is required for memory search");
        }
        const limit = typeof payload.limit === "number" ? Math.min(Math.max(payload.limit, 1), 20) : 5;
        const minSimilarity = typeof payload.minSimilarity === "number" ? payload.minSimilarity : 0.2;
        const results = await this.memoryService.search(userId, query.trim(), {
          limit,
          minSimilarity,
          sourceType: payload.sourceType as any,
        });
        return {
          success: true,
          data: {
            query: query.trim(),
            results,
          },
        };
      }

      case "create_wellness_goal": {
        const title = payload.title as string | undefined;
        if (!title || typeof title !== "string" || title.trim().length === 0) {
          throw new BadRequestException("Goal title is required");
        }
        const description = typeof payload.description === "string" ? payload.description : undefined;
        const targetDate = typeof payload.targetDate === "string" ? payload.targetDate : undefined;
        const approved = payload.approved === true;

        if (!approved) {
          // Mutating operations strictly require human approval
          return {
            success: true,
            data: {
              status: "PENDING_APPROVAL",
              requiresApproval: true,
              message: "Goal creation proposed. Awaiting user confirmation.",
              proposedGoal: {
                title: title.trim(),
                description,
                targetDate,
              },
            },
          };
        }

        // Executed only upon explicit human approval confirmation
        const goal = await this.goalsService.createGoal(userId, {
          title: title.trim(),
          description,
          targetDate,
          status: "ACTIVE",
        });

        return {
          success: true,
          data: {
            status: "ACTIVE",
            requiresApproval: false,
            goal,
          },
        };
      }

      default: {
        throw new BadRequestException(`Unsupported tool: ${tool}`);
      }
    }
  }
}
