import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { AgentService } from "./agent.service";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  AgentChatRequestSchema,
  AgentApprovalRequestSchema,
  type AgentChatRequestDTO,
  type AgentApprovalRequestDTO,
} from "@soulsync/contracts";

@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Start or continue an interactive conversation stream with the AI companion agent.
   */
  @Post("chat")
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AgentChatRequestSchema)) dto: AgentChatRequestDTO,
    @Res() res: Response
  ) {
    return this.agentService.chatStream(
      user.id,
      dto.message,
      res,
      dto.threadId
    );
  }

  /**
   * Confirm or reject a pending human-in-the-loop action proposed by the agent.
   */
  @Post("approve")
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AgentApprovalRequestSchema)) dto: AgentApprovalRequestDTO,
    @Res() res: Response
  ) {
    const threadId = dto.threadId || dto.actionId.replace("act_", "");
    return this.agentService.approveStream(
      user.id,
      dto.actionId,
      dto.approved,
      res,
      threadId,
      dto.modifiedPayload
    );
  }

  /**
   * List conversation threads for the authenticated user.
   */
  @Get("threads")
  async listThreads(@CurrentUser() user: AuthenticatedUser) {
    const threads = await this.agentService.listThreads(user.id);
    return {
      success: true,
      data: threads,
    };
  }

  /**
   * Retrieve messages within a specific conversation thread.
   */
  @Get("threads/:id/messages")
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") threadId: string
  ) {
    const messages = await this.agentService.listMessages(user.id, threadId);
    return {
      success: true,
      data: messages,
    };
  }
}
