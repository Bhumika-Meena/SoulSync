import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import type { EnvironmentVariables } from "../common/config/env.schema";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const databaseUrl = configService.get("DATABASE_URL", { infer: true });
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log("Connecting to PostgreSQL database via Prisma...");
    try {
      await this.$connect();
      this.logger.log("PostgreSQL database connection established.");
    } catch (error) {
      this.logger.warn(
        "Could not establish database connection during bootstrap. Prisma will attempt connection on request execution."
      );
    }
  }

  async onModuleDestroy() {
    this.logger.log("Disconnecting from PostgreSQL database...");
    try {
      await this.$disconnect();
      this.logger.log("PostgreSQL database connection closed.");
    } catch (error) {
      this.logger.error("Error disconnecting from database", error);
    }
  }
}
