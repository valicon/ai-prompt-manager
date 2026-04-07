import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authMiddleware } from "./authMiddleware";
import type { Request, Response, NextFunction } from "express";

function makeReq(authHeader?: string): Request {
  return { headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; _status?: number } {
  const res = { json: vi.fn(), status: vi.fn() } as unknown as ReturnType<typeof makeRes>;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { vi } from "vitest";

describe("authMiddleware", () => {
  const next: NextFunction = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PROMPTLAB_API_KEY;
  });

  it("is a no-op when PROMPTLAB_API_KEY is not set", () => {
    delete process.env.PROMPTLAB_API_KEY;
    const req = makeReq();
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows request with valid token", () => {
    process.env.PROMPTLAB_API_KEY = "secret";
    const req = makeReq("Bearer secret");
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects request with invalid token", () => {
    process.env.PROMPTLAB_API_KEY = "secret";
    const req = makeReq("Bearer wrong");
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects request with no Authorization header", () => {
    process.env.PROMPTLAB_API_KEY = "secret";
    const req = makeReq();
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects request with non-Bearer auth scheme", () => {
    process.env.PROMPTLAB_API_KEY = "secret";
    const req = makeReq("Basic dXNlcjpwYXNz");
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
