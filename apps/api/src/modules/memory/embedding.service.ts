import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private static readonly EMBEDDING_DIMENSION = 1536;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  /**
   * Generate 1536-dimensional vector embedding for text.
   * Uses OpenAI text-embedding-3-small when API key is provided,
   * otherwise falls back to a deterministic, normalized keyword-hashed vector.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      return this.generateDeterministicEmbedding("empty");
    }

    const apiKey = this.configService.get("OPENAI_API_KEY", { infer: true });
    if (!apiKey || apiKey.trim() === "" || apiKey === "your-openai-api-key") {
      return this.generateDeterministicEmbedding(trimmed);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: trimmed.slice(0, 8000),
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `OpenAI embeddings API responded with status ${response.status}. Using deterministic fallback.`
        );
        return this.generateDeterministicEmbedding(trimmed);
      }

      const data = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embedding = data?.data?.[0]?.embedding;

      if (
        Array.isArray(embedding) &&
        embedding.length === EmbeddingService.EMBEDDING_DIMENSION
      ) {
        return embedding;
      }

      this.logger.warn(
        "OpenAI response missing valid 1536-dim embedding array. Using deterministic fallback."
      );
      return this.generateDeterministicEmbedding(trimmed);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to reach OpenAI embeddings endpoint: ${err}. Using deterministic fallback.`
      );
      return this.generateDeterministicEmbedding(trimmed);
    }
  }

  /**
   * Deterministic local embedding generator.
   * Produces an L2-normalized 1536-dimensional float vector seeded by text tokens.
   * Preserves cosine similarity properties for overlapping keywords without network dependency.
   */
  generateDeterministicEmbedding(text: string): number[] {
    const dim = EmbeddingService.EMBEDDING_DIMENSION;
    const vector = new Float64Array(dim);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [text];

    for (const word of words) {
      const hash = crypto.createHash("sha256").update(word).digest();
      for (let i = 0; i < 32; i += 2) {
        const idx = (hash[i] * 256 + hash[i + 1]) % dim;
        const sign = hash[i] % 2 === 0 ? 1 : -1;
        vector[idx] += sign;
      }
    }

    // Compute Euclidean norm
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
      vector[0] = 1;
      norm = 1;
    }

    // Normalize to unit length (L2 norm = 1.0)
    const result: number[] = new Array(dim);
    for (let i = 0; i < dim; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }

    return result;
  }
}
