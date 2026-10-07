import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { EnvironmentVariables } from "./common/config/env.schema";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const port = configService.get("PORT", { infer: true });
  const corsOrigin = configService.get("CORS_ORIGIN", { infer: true });

  app.setGlobalPrefix("api/v1", {
    exclude: ["internal/(.*)"],
  });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "x-user-id",
      "x-internal-signature",
      "x-internal-timestamp",
    ],
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  console.log(`[SoulSync API] Running on port ${port}`);
}

bootstrap();
