import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { InternalHmacGuard } from "../src/common/guards/internal-hmac.guard";
import { UnauthorizedException, ForbiddenException, type ExecutionContext } from "@nestjs/common";

function createMockConfigService(secret: string | null = "test-internal-agent-secret-32-chars-ok!") {
  return {
    get: (_key: string) => secret,
  } as any;
}

function createMockContext(headers: Record<string, string>, body: any = {}, rawBody?: Buffer): ExecutionContext {
  const req = {
    headers,
    body,
    rawBody,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

test("InternalHmacGuard: rejects request missing signature header", () => {
  const guard = new InternalHmacGuard(createMockConfigService());
  const ctx = createMockContext({ "x-internal-timestamp": "1700000000" });

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "UNAUTHORIZED_INTERNAL_CALL");
      return true;
    }
  );
});

test("InternalHmacGuard: rejects request missing timestamp header", () => {
  const guard = new InternalHmacGuard(createMockConfigService());
  const ctx = createMockContext({ "x-internal-signature": "abcdef" });

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "UNAUTHORIZED_INTERNAL_CALL");
      return true;
    }
  );
});

test("InternalHmacGuard: rejects invalid non-integer timestamp", () => {
  const guard = new InternalHmacGuard(createMockConfigService());
  const ctx = createMockContext({
    "x-internal-signature": "abcdef",
    "x-internal-timestamp": "not-a-number",
  });

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "INVALID_INTERNAL_TIMESTAMP");
      return true;
    }
  );
});

test("InternalHmacGuard: rejects expired timestamp (> 300 seconds difference)", () => {
  const guard = new InternalHmacGuard(createMockConfigService());
  const staleTimestamp = Math.floor(Date.now() / 1000) - 301;
  const ctx = createMockContext({
    "x-internal-signature": "abcdef",
    "x-internal-timestamp": staleTimestamp.toString(),
  });

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "EXPIRED_INTERNAL_REQUEST");
      return true;
    }
  );
});

test("InternalHmacGuard: rejects when INTERNAL_AGENT_SECRET is not configured", () => {
  const guard = new InternalHmacGuard(createMockConfigService(null));
  const now = Math.floor(Date.now() / 1000).toString();
  const ctx = createMockContext({
    "x-internal-signature": "abcdef",
    "x-internal-timestamp": now,
  });

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof ForbiddenException);
      assert.equal(err.getResponse().code, "INTERNAL_SECRET_NOT_CONFIGURED");
      return true;
    }
  );
});

test("InternalHmacGuard: rejects invalid or tampered HMAC signature", () => {
  const secret = "test-internal-agent-secret-32-chars-ok!";
  const guard = new InternalHmacGuard(createMockConfigService(secret));
  const now = Math.floor(Date.now() / 1000).toString();
  const body = { tool: "search_memory", userId: "u1" };

  const badSignature = crypto
    .createHmac("sha256", "wrong-secret")
    .update(`${now}${JSON.stringify(body)}`)
    .digest("hex");

  const ctx = createMockContext(
    {
      "x-internal-signature": badSignature,
      "x-internal-timestamp": now,
    },
    body
  );

  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "INVALID_INTERNAL_SIGNATURE");
      return true;
    }
  );
});

test("InternalHmacGuard: accepts valid HMAC signature", () => {
  const secret = "test-internal-agent-secret-32-chars-ok!";
  const guard = new InternalHmacGuard(createMockConfigService(secret));
  const now = Math.floor(Date.now() / 1000).toString();
  const body = { tool: "search_memory", userId: "u1" };
  const bodyStr = JSON.stringify(body);

  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(`${now}${bodyStr}`)
    .digest("hex");

  const ctx = createMockContext(
    {
      "x-internal-signature": validSignature,
      "x-internal-timestamp": now,
    },
    body
  );

  const result = guard.canActivate(ctx);
  assert.equal(result, true);
});

test("InternalHmacGuard: blocks replay attacks for identical signature within window", () => {
  const secret = "test-internal-agent-secret-32-chars-ok!";
  const guard = new InternalHmacGuard(createMockConfigService(secret));
  const now = Math.floor(Date.now() / 1000).toString();
  const body = { tool: "create_wellness_goal", userId: "u1" };
  const bodyStr = JSON.stringify(body);

  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(`${now}${bodyStr}`)
    .digest("hex");

  const ctx = createMockContext(
    {
      "x-internal-signature": validSignature,
      "x-internal-timestamp": now,
    },
    body
  );

  // First request passes
  assert.equal(guard.canActivate(ctx), true);

  // Immediate second request with identical signature is rejected as a replay
  assert.throws(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "REPLAYED_INTERNAL_REQUEST");
      assert.ok(err.message.includes("replay detected"));
      return true;
    }
  );
});
