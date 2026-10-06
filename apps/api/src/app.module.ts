import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./common/config/env.schema";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { JournalModule } from "./modules/journal/journal.module";
import { EmotionsModule } from "./modules/emotions/emotions.module";
import { UsersModule } from "./modules/users/users.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: [".env.local", ".env", "../../.env"],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    JournalModule,
    EmotionsModule,
    UsersModule,
    GoalsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
