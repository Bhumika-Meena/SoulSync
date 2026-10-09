import test from "node:test";
import assert from "node:assert/strict";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";

function createMockJwtService(verifyResult: any = { sub: "user-123", email: "user@example.com" }) {
  return {
    verifyAsync: async () => {
      if (verifyResult instanceof Error) throw verifyResult;
      return verifyResult;
    },
  } as any;
}

function createMockReflector(isPublic: boolean = false) {
  return {
    getAllAndOverride: () => isPublic,
  } as any;
}

function createMockConfigService(jwtSecret: string = "super-secret-jwt-key-at-least-32-chars!") {
  return {
    get: () => jwtSecret,
  } as any;
}

function createMockContext(headers: Record<string, string> = {}): { context: ExecutionContext; req: any } {
  const req: any = { headers };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
  return { context, req };
}

test("JwtAuthGuard: allows public route without token", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService(),
    createMockReflector(true),
    createMockConfigService()
  );
  const { context } = createMockContext({});

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test("JwtAuthGuard: rejects protected route missing Authorization header", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService(),
    createMockReflector(false),
    createMockConfigService()
  );
  const { context } = createMockContext({});

  await assert.rejects(
    () => guard.canActivate(context),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "UNAUTHORIZED");
      assert.ok(err.message.includes("token is required"));
      return true;
    }
  );
});

test("JwtAuthGuard: rejects non-Bearer authorization header format", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService(),
    createMockReflector(false),
    createMockConfigService()
  );
  const { context } = createMockContext({ authorization: "Basic dXNlcjpwYXNz" });

  await assert.rejects(
    () => guard.canActivate(context),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "UNAUTHORIZED");
      return true;
    }
  );
});

test("JwtAuthGuard: rejects invalid or expired JWT token", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService(new Error("jwt expired")),
    createMockReflector(false),
    createMockConfigService()
  );
  const { context } = createMockContext({ authorization: "Bearer expired.token.here" });

  await assert.rejects(
    () => guard.canActivate(context),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "INVALID_TOKEN");
      assert.ok(err.message.includes("Invalid or expired"));
      return true;
    }
  );
});

test("JwtAuthGuard: rejects token missing sub (user identifier)", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService({ email: "nouser@example.com" }),
    createMockReflector(false),
    createMockConfigService()
  );
  const { context } = createMockContext({ authorization: "Bearer valid.token.without.sub" });

  await assert.rejects(
    () => guard.canActivate(context),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.equal(err.getResponse().code, "INVALID_TOKEN");
      assert.ok(err.message.includes("missing user identifier"));
      return true;
    }
  );
});

test("JwtAuthGuard: accepts valid JWT token and attaches user to request", async () => {
  const guard = new JwtAuthGuard(
    createMockJwtService({ sub: "user-456", email: "alice@example.com" }),
    createMockReflector(false),
    createMockConfigService()
  );
  const { context, req } = createMockContext({ authorization: "Bearer valid.signature.token" });

  const result = await guard.canActivate(context);
  assert.equal(result, true);
  assert.equal(req.user.id, "user-456");
  assert.equal(req.user.email, "alice@example.com");
});
