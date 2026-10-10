import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { InternalHmacGuard } from "../../common/guards/internal-hmac.guard";
import { InternalToolsService } from "./internal-tools.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  InternalToolExecutionRequestSchema,
  type InternalToolExecutionRequestDTO,
} from "@soulsync/contracts";

@Controller("internal/v1")
@Public()
@UseGuards(InternalHmacGuard)
export class InternalController {
  constructor(private readonly internalToolsService: InternalToolsService) {}

  @Post("tools/execute")
  @HttpCode(HttpStatus.OK)
  async executeTool(
    @Body(new ZodValidationPipe(InternalToolExecutionRequestSchema))
    dto: InternalToolExecutionRequestDTO,
    @Req() req: Request
  ) {
    const correlationId =
      req.correlationId ||
      (req.headers["x-correlation-id"] as string | undefined) ||
      (req.headers["x-request-id"] as string | undefined);
    return this.internalToolsService.executeTool(
      dto.tool,
      dto.userId,
      dto.payload,
      correlationId
    );
  }
}
