import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { EnvironmentVariables } from "./common/config/env.schema";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const port = configService.get("PORT", { infer: true });
  const corsOrigin = configService.get("CORS_ORIGIN", { infer: true });

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  console.log(`[SoulSync API] Running on port ${port}`);
}

bootstrap();
