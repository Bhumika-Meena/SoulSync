import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { JournalService } from "./journal.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import {
  CreateJournalEntrySchema,
  JournalQuerySchema,
  type CreateJournalEntryDTO,
  type JournalQueryDTO,
} from "@soulsync/contracts";

@Controller("journal")
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  async listEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(JournalQuerySchema)) query?: JournalQueryDTO
  ) {
    const result = await this.journalService.listEntries(user.id, query);

    return {
      success: true,
      data: result.entries,
      pagination: result.pagination,
    };
  }

  @Get("today")
  async getTodaysEntry(@CurrentUser() user: AuthenticatedUser) {
    const entry = await this.journalService.getTodaysEntry(user.id);

    return {
      success: true,
      data: entry,
    };
  }

  @Get(":id")
  async getEntryById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const entry = await this.journalService.getEntryById(user.id, id);

    return {
      success: true,
      data: entry,
    };
  }

  @Post()
  async createEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateJournalEntrySchema))
    body?: CreateJournalEntryDTO
  ) {
    const entry = await this.journalService.createEntry(user.id, body!);

    return {
      success: true,
      data: entry,
    };
  }

  @Delete(":id")
  async deleteEntry(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.journalService.deleteEntry(user.id, id);

    return {
      success: true,
      message: "Journal entry deleted successfully",
    };
  }
}
