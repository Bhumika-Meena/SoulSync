import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get("profile")
  async getProfile(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string
  ) {
    const userId = this.extractUserId(headerUserId, queryUserId);
    const user = await this.usersService.getProfile(userId);

    return {
      success: true,
      data: user,
    };
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);

    return {
      success: true,
      data: user,
    };
  }
}
