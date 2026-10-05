import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { JournalService } from "./journal.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  CreateJournalEntrySchema,
  JournalQuerySchema,
  type CreateJournalEntryDTO,
  type JournalQueryDTO,
} from "@soulsync/contracts";

@Controller("journal")
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

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

  @Get()
  async listEntries(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Query(new ZodValidationPipe(JournalQuerySchema)) query?: JournalQueryDTO
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const result = await this.journalService.listEntries(userId, query);

    return {
      success: true,
      data: result.entries,
      pagination: result.pagination,
    };
  }

  @Get("today")
  async getTodaysEntry(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const entry = await this.journalService.getTodaysEntry(userId);

    return {
      success: true,
      data: entry,
    };
  }

  @Get(":id")
  async getEntryById(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const entry = await this.journalService.getEntryById(userId, id);

    return {
      success: true,
      data: entry,
    };
  }

  @Post()
  async createEntry(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Body(new ZodValidationPipe(CreateJournalEntrySchema))
    body?: CreateJournalEntryDTO
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const entry = await this.journalService.createEntry(userId, body!);

    return {
      success: true,
      data: entry,
    };
  }
}
