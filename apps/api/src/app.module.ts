import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./common/config/env.schema";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { JournalModule } from "./modules/journal/journal.module";
import { EmotionsModule } from "./modules/emotions/emotions.module";
import { UsersModule } from "./modules/users/users.module";
import { GoalsModule } from "./modules/goals/goals.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: [".env.local", ".env", "../../.env"],
    }),
    DatabaseModule,
    HealthModule,
    JournalModule,
    EmotionsModule,
    UsersModule,
    GoalsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
