import {
  Controller,
  Get,
  Param,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.getProfile(user.id);

    return {
      success: true,
      data: profile,
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
