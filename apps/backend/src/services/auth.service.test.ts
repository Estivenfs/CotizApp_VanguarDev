jest.mock("../config/auth.js", () => ({
  authConfig: {
    jwtSecret: "test-secret",
    jwtExpiresIn: "1h",
    maxFailedAttempts: 3,
    lockMinutes: 5,
    lockIncrementMinutes: 5
  }
}));

jest.mock("node:crypto", () => ({
  scrypt: jest.fn(),
  timingSafeEqual: jest.fn(),
  randomBytes: jest.fn()
}));

jest.mock("../models/user.model.js", () => ({
  getUserByEmail: jest.fn(),
  setUserLockState: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
  default: { sign: jest.fn(), verify: jest.fn() },
  sign: jest.fn(),
  verify: jest.fn()
}));

import crypto from "node:crypto";
import { loginWithPassword, verifyAccessToken } from "./auth.service.js";
import * as userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";

type MFn = jest.MockedFunction<(...args: any[]) => any>;
const mockScrypt = crypto.scrypt as unknown as MFn;
const mockTimingSafeEqual = crypto.timingSafeEqual as unknown as MFn;
const mockRandomBytes = crypto.randomBytes as unknown as MFn;

const SALT_HEX = Buffer.alloc(16, 0xaa).toString("hex");
const KEY_HEX = Buffer.alloc(64, 0xab).toString("hex");
const validHash = `scrypt:${SALT_HEX}:${KEY_HEX}`;

const mockDbUser = {
  id: "1", id_empresa: "1", empresa_nombre: "Test Corp", empresa_activa: true,
  nombre: "Juan", email: "juan@test.com", rol: "Vendedor", activo: true,
  password_hash: validHash, failed_login_attempts: 0, lock_level: 0, lock_until: null
};

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScrypt.mockImplementation((_pwd: string, _salt: any, len: number, cb: Function) => {
      cb(null, Buffer.alloc(len, 0xab));
    });
    mockTimingSafeEqual.mockReturnValue(true);
    mockRandomBytes.mockReturnValue(Buffer.alloc(16, 0xcd));
  });

  describe("loginWithPassword", () => {
    it("returns invalid_credentials when user not found", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue(null);
      const result = await loginWithPassword({ email: "x@x.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("returns locked when account is already locked", async () => {
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

    it("returns invalid_credentials when userId is not finite", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, id: "abc" });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("records failed attempt without locking (below threshold)", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, failed_login_attempts: 0, lock_level: 0, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(false);

      const result = await loginWithPassword({ email: "juan@test.com", password: "wrong" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
      expect(userModel.setUserLockState).toHaveBeenCalledWith(1, {
        failedLoginAttempts: 1, lockUntil: null, lockLevel: 0
      });
    });

    it("triggers lock after max failed attempts (3rd attempt)", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, failed_login_attempts: 2, lock_level: 0, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(false);

      const beforeCall = Date.now();
      const result = await loginWithPassword({ email: "juan@test.com", password: "wrong" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("locked");
        expect(typeof result.lockUntilMs).toBe("number");
        expect(result.lockUntilMs!).toBeGreaterThan(beforeCall);
      }
      expect(userModel.setUserLockState).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ failedLoginAttempts: 0, lockLevel: 1 })
      );
      const lockCall = (userModel.setUserLockState as MFn).mock.calls[0][1] as any;
      expect(typeof lockCall.lockUntil).toBe("string");
      expect(lockCall.lockUntil).toBeTruthy();
    });

    it("applies progressive lock duration (lockLevel 2→3)", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, failed_login_attempts: 2, lock_level: 2, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(false);

      const result = await loginWithPassword({ email: "juan@test.com", password: "wrong" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("locked");
      expect(userModel.setUserLockState).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ lockLevel: 3 })
      );
    });

    it("returns token and user on successful login (happy path)", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(true);
      (jwt.sign as unknown as MFn).mockReturnValue("jwt-signed-token");

      const result = await loginWithPassword({ email: "juan@test.com", password: "correct" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.token).toBe("jwt-signed-token");
        expect(result.user.email).toBe("juan@test.com");
        expect(result.user.id).toBe(1);
        expect(result.user.empresaId).toBe(1);
        expect(result.user.rol).toBe("Vendedor");
      }
      expect(userModel.setUserLockState).toHaveBeenCalledWith(1, {
        failedLoginAttempts: 0, lockUntil: null, lockLevel: 0
      });
    });

    it("normalizes email to lowercase", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(true);
      (jwt.sign as unknown as MFn).mockReturnValue("token");
      await loginWithPassword({ email: "Juan@Test.com", password: "correct" });
      expect(userModel.getUserByEmail).toHaveBeenCalledWith("juan@test.com");
    });

    it("falls back to Vendedor when role is invalid", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, rol: "InvalidRole", password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(true);
      (jwt.sign as unknown as MFn).mockReturnValue("token");
      const result = await loginWithPassword({ email: "juan@test.com", password: "correct" });
      if (result.ok) expect(result.user.rol).toBe("Vendedor");
    });

    it("handles null empresaId correctly", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, id_empresa: null, empresa_nombre: null, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(true);
      (jwt.sign as unknown as MFn).mockReturnValue("token");
      const result = await loginWithPassword({ email: "juan@test.com", password: "correct" });
      if (result.ok) {
        expect(result.user.empresaId).toBeNull();
        expect(result.user.empresaNombre).toBeNull();
      }
    });

    it("clears lock on successful login", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({
        ...mockDbUser, failed_login_attempts: 2, lock_level: 1, password_hash: validHash
      });
      (userModel.setUserLockState as MFn).mockResolvedValue(undefined);
      mockTimingSafeEqual.mockReturnValue(true);
      (jwt.sign as unknown as MFn).mockReturnValue("token");

      await loginWithPassword({ email: "juan@test.com", password: "correct" });
      expect(userModel.setUserLockState).toHaveBeenCalledWith(1, {
        failedLoginAttempts: 0, lockUntil: null, lockLevel: 0
      });
    });
  });

  describe("verifyAccessToken", () => {
    it("returns null on invalid token", () => {
      (jwt.verify as unknown as MFn).mockImplementation(() => { throw new Error("invalid"); });
      expect(verifyAccessToken("bad-token")).toBeNull();
    });

    it("returns null when decoded is not an object", () => {
      (jwt.verify as unknown as MFn).mockReturnValue("string");
      expect(verifyAccessToken("token")).toBeNull();
    });

    it("returns null when sub is missing", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ email: "a@b.com", nombre: "N", rol: "Vendedor" });
      expect(verifyAccessToken("token")).toBeNull();
    });

    it("returns null when rol is invalid", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", email: "a@b.com", nombre: "N", rol: "Invalid" });
      expect(verifyAccessToken("token")).toBeNull();
    });

    it("returns null when empresaId is not finite", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", empresaId: "abc", email: "a@b.com", nombre: "N", rol: "Vendedor" });
      expect(verifyAccessToken("token")).toBeNull();
    });

    it("handles empresaId: 0 correctly", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", empresaId: 0, empresaNombre: "Test", email: "a@b.com", nombre: "N", rol: "Vendedor" });
      const user = verifyAccessToken("token");
      expect(user).not.toBeNull();
      expect(user?.empresaId).toBe(0);
    });

    it("handles empresaId: null", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", empresaId: null, empresaNombre: null, email: "a@b.com", nombre: "N", rol: "Vendedor" });
      const user = verifyAccessToken("token");
      expect(user).not.toBeNull();
      expect(user?.empresaId).toBeNull();
    });

    it("handles empresaId: undefined", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", email: "a@b.com", nombre: "N", rol: "Vendedor" });
      const user = verifyAccessToken("token");
      expect(user).not.toBeNull();
      expect(user?.empresaId).toBeNull();
    });

    it("returns user on valid token with all fields", () => {
      (jwt.verify as unknown as MFn).mockReturnValue({ sub: "1", empresaId: 1, empresaNombre: "Test", email: "a@b.com", nombre: "Name", rol: "Vendedor" });
      const user = verifyAccessToken("token");
      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
      expect(user?.rol).toBe("Vendedor");
    });
  });

  describe("verifyPassword edge cases", () => {
    it("rejects non-scrypt hash format", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, password_hash: "bcrypt:x:y" });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("rejects hash with wrong part count", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, password_hash: "scrypt:abc" });
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });

    it("rejects when timingSafeEqual returns false", async () => {
      (userModel.getUserByEmail as MFn).mockResolvedValue({ ...mockDbUser, password_hash: validHash });
      mockTimingSafeEqual.mockReturnValue(false);
      const result = await loginWithPassword({ email: "juan@test.com", password: "test" });
      expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    });
  });
});
