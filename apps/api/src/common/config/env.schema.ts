import { z } from "zod";

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET must be at least 16 characters")
      .default("soulsync-development-jwt-secret-do-not-use-in-production"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    OPENAI_API_KEY: z.string().optional(),
    INTERNAL_AGENT_SECRET: z
      .string()
      .min(16, "INTERNAL_AGENT_SECRET must be at least 16 characters")
      .default("soulsync-internal-agent-secret-do-not-use-in-production"),
    AGENT_SERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return (
          data.JWT_SECRET !== "soulsync-development-jwt-secret-do-not-use-in-production" &&
          data.JWT_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message: "Production requires a custom JWT_SECRET of at least 32 characters",
      path: ["JWT_SECRET"],
    }
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return (
          data.INTERNAL_AGENT_SECRET !== "soulsync-internal-agent-secret-do-not-use-in-production" &&
          data.INTERNAL_AGENT_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message: "Production requires a custom INTERNAL_AGENT_SECRET of at least 32 characters",
      path: ["INTERNAL_AGENT_SECRET"],
    }
  );

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>
): EnvironmentVariables {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    throw new Error(
      `[SoulSync API] Environment validation failed:\n${formattedErrors}\nPlease check your .env file or environment variables.`
    );
  }

  return result.data;
}
