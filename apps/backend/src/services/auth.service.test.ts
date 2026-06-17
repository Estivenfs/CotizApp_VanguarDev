import { loginWithPassword, verifyAccessToken } from "./auth.service.js";

jest.mock("../models/user.model.js", () => ({
  getUserByEmail: jest.fn(),
  setUserLockState: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  },
  sign: jest.fn(),
  verify: jest.fn()
}));

import * as userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

const mockDbUser = {
  id: "1", id_empresa: "1", empresa_nombre: "Test Corp", empresa_activa: true,
  nombre: "Juan", email: "juan@test.com", rol: "Vendedor", activo: true,
  password_hash: "scrypt:abc:def", failed_login_attempts: 0, lock_level: 0, lock_until: null
};

describe("auth.service", () => {
  describe("loginWithPassword", () => {
    it("returns invalid_credentials when user not found", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue(null);
      const result = await loginWithPassword({ email: "x@x.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("returns locked when account is locked", async () => {
      const futureLock = new Date(Date.now() + 3600000).toISOString();
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, lock_until: futureLock });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("locked");
        expect(typeof result.lockUntilMs).toBe("number");
      }
    });

    it("returns invalid_credentials for inactive user", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, activo: false });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("returns invalid_credentials for inactive company", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, empresa_activa: false });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });
  });

  describe("verifyAccessToken", () => {
    it("returns null on invalid token", () => {
      (jwt.verify as unknown as MFn).mockImplementation(() => { throw new Error("invalid"); });
      expect(verifyAccessToken("bad-token")).toBeNull();
    });

    it("returns null on malformed payload", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1" });
      expect(verifyAccessToken("token")).toBeNull();
    });

    it("returns user on valid token", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({
        sub: "1", empresaId: 1, empresaNombre: "Test",
        email: "a@b.com", nombre: "Name", rol: "Vendedor"
      });
      const user = verifyAccessToken("token");
      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
      expect(user?.rol).toBe("Vendedor");
    });
  });
});
