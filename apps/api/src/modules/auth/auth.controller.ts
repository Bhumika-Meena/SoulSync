import { Controller, Post, Get, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "../../common/decorators/public.decorator";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  RegisterUserSchema,
  LoginUserSchema,
  type RegisterUserDTO,
  type LoginUserDTO,
} from "@soulsync/contracts";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterUserSchema)) dto: RegisterUserDTO
  ) {
    const result = await this.authService.register(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(LoginUserSchema)) dto: LoginUserDTO
  ) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Get("me")
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getMe(user.id);
    return {
      success: true,
      data: profile,
    };
  }
}
