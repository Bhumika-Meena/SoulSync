import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/common/config/env.schema";

test("env.schema: development mode accepts default development secrets", () => {
  const config = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  };

  const parsed = validateEnvironment(config);
  assert.equal(parsed.NODE_ENV, "development");
  assert.equal(parsed.PORT, 4000);
  assert.equal(
    parsed.JWT_SECRET,
    "soulsync-development-jwt-secret-do-not-use-in-production"
  );
  assert.equal(
    parsed.INTERNAL_AGENT_SECRET,
    "soulsync-internal-agent-secret-do-not-use-in-production"
  );
});

test("env.schema: production mode rejects default development JWT_SECRET", () => {
  const config = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    JWT_SECRET: "soulsync-development-jwt-secret-do-not-use-in-production",
    INTERNAL_AGENT_SECRET: "strong-internal-agent-secret-32-chars-long!",
  };

  assert.throws(
    () => validateEnvironment(config),
    (err: Error) => {
      assert.ok(err.message.includes("Production requires a custom JWT_SECRET of at least 32 characters"));
      return true;
    }
  );
});

test("env.schema: production mode rejects short JWT_SECRET (< 32 chars)", () => {
  const config = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    JWT_SECRET: "too-short-jwt-secret-12345",
    INTERNAL_AGENT_SECRET: "strong-internal-agent-secret-32-chars-long!",
  };

  assert.throws(
    () => validateEnvironment(config),
    (err: Error) => {
      assert.ok(err.message.includes("Production requires a custom JWT_SECRET of at least 32 characters"));
      return true;
    }
  );
});

test("env.schema: production mode rejects default INTERNAL_AGENT_SECRET", () => {
  const config = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    JWT_SECRET: "strong-custom-production-jwt-secret-at-least-32-chars!",
    INTERNAL_AGENT_SECRET: "soulsync-internal-agent-secret-do-not-use-in-production",
  };

  assert.throws(
    () => validateEnvironment(config),
    (err: Error) => {
      assert.ok(err.message.includes("Production requires a custom INTERNAL_AGENT_SECRET of at least 32 characters"));
      return true;
    }
  );
});

test("env.schema: production mode rejects short INTERNAL_AGENT_SECRET (< 32 chars)", () => {
  const config = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    JWT_SECRET: "strong-custom-production-jwt-secret-at-least-32-chars!",
    INTERNAL_AGENT_SECRET: "short-secret-123",
  };

  assert.throws(
    () => validateEnvironment(config),
    (err: Error) => {
      assert.ok(err.message.includes("Production requires a custom INTERNAL_AGENT_SECRET of at least 32 characters"));
      return true;
    }
  );
});

test("env.schema: production mode accepts strong secrets (>= 32 chars)", () => {
  const config = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    JWT_SECRET: "super-secure-production-jwt-secret-key-32-characters!",
    INTERNAL_AGENT_SECRET: "super-secure-internal-agent-secret-key-32-chars!",
  };

  const parsed = validateEnvironment(config);
  assert.equal(parsed.NODE_ENV, "production");
  assert.equal(parsed.JWT_SECRET, config.JWT_SECRET);
  assert.equal(parsed.INTERNAL_AGENT_SECRET, config.INTERNAL_AGENT_SECRET);
});

test("env.schema: rejects missing DATABASE_URL", () => {
  const config = {
    NODE_ENV: "development",
  };

  assert.throws(
    () => validateEnvironment(config),
    (err: Error) => {
      assert.ok(err.message.includes("DATABASE_URL"));
      return true;
    }
  );
});
