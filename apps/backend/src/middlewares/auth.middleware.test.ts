import { authMiddleware } from "./auth.middleware.js";

jest.mock("../services/auth.service.js", () => ({
  verifyAccessToken: jest.fn()
}));

import * as authService from "../services/auth.service.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockReqResNext() {
  const req: any = { headers: {} };
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  const next = jest.fn();
  return { req, res, next };
}

describe("auth.middleware", () => {
  it("returns 401 when no authorization header", () => {
    const { req, res, next } = mockReqResNext();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is not Bearer", () => {
    const { req, res, next } = mockReqResNext();
    req.headers = { authorization: "Basic xyz" };
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when token is invalid", () => {
    const { req, res, next } = mockReqResNext();
    req.headers = { authorization: "Bearer bad-token" };
    (authService.verifyAccessToken as MFn).mockReturnValue(null);
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("sets req.user and calls next on valid token", () => {
    const { req, res, next } = mockReqResNext();
    req.headers = { authorization: "Bearer valid-token" };
    const mockUser = { id: 1, rol: "Vendedor" as const, empresaId: 1, nombre: "T", email: "t@t.com", empresaNombre: "E" };
    (authService.verifyAccessToken as MFn).mockReturnValue(mockUser);
    authMiddleware(req, res, next);
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalled();
  });
});
