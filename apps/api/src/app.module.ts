import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./common/config/env.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: [".env.local", ".env", "../../.env"],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
