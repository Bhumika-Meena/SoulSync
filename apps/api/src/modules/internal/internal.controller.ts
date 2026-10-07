import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
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
    dto: InternalToolExecutionRequestDTO
  ) {
    return this.internalToolsService.executeTool(
      dto.tool,
      dto.userId,
      dto.payload
    );
  }
}
