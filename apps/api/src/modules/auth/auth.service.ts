import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { hash, compare } from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";
import type { EnvironmentVariables } from "../../common/config/env.schema";
import type {
  RegisterUserDTO,
  LoginUserDTO,
  AuthResponseDTO,
  UserProfileDTO,
} from "@soulsync/contracts";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  /**
   * Register a new user with hashed password and return access token + profile.
   */
  async register(dto: RegisterUserDTO): Promise<AuthResponseDTO> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        code: "USER_ALREADY_EXISTS",
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name ?? null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });

    const accessToken = await this.generateToken(user.id, user.email);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Validate credentials and issue access token + profile.
   */
  async login(dto: LoginUserDTO): Promise<AuthResponseDTO> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const isValid = await compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const accessToken = await this.generateToken(user.id, user.email);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Retrieve current user profile by authenticated user ID.
   */
  async getMe(userId: string): Promise<UserProfileDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Generate signed JWT access token with user claims.
   */
  private async generateToken(userId: string, email?: string | null): Promise<string> {
    const secret = this.configService.get("JWT_SECRET", { infer: true });
    const expiresIn = this.configService.get("JWT_EXPIRES_IN", { infer: true });

    return this.jwtService.signAsync(
      { sub: userId, email: email ?? undefined },
      { secret, expiresIn: (expiresIn ?? "7d") as any }
    );
  }
}
