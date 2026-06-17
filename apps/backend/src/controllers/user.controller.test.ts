import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deactivateUserHandler,
  unlockUserHandler
} from "./user.controller.js";

jest.mock("../models/company.model.js", () => ({
  getCompanyById: jest.fn()
}));

jest.mock("../models/user.model.js", () => ({
  listUsers: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deactivateUser: jest.fn(),
  unlockUser: jest.fn()
}));

jest.mock("../utils/access.js", () => ({
  isSuperAdmin: jest.fn(),
  canAssignRole: jest.fn(),
  isRole: jest.fn((v: string) => v === "SuperAdmin" || v === "Admin" || v === "Vendedor")
}));

jest.mock("../utils/request-scope.js", () => ({
  parseNumericId: jest.fn()
}));

import * as userModel from "../models/user.model.js";
import * as companyModel from "../models/company.model.js";
import * as access from "../utils/access.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockSuperAdmin = { id: 1, rol: "SuperAdmin" as const, empresaId: null, nombre: "SA", email: "sa@sa.com", empresaNombre: null };
const mockAdmin = { id: 1, rol: "Admin" as const, empresaId: 1, nombre: "Admin", email: "a@a.com", empresaNombre: "Emp" };
const mockDbUser = { id: "2", id_empresa: "1", nombre: "Vendedor", email: "v@v.com", rol: "Vendedor", activo: true };

describe("user.controller", () => {
  beforeEach(() => {
    (requestScope.parseNumericId as MFn).mockReturnValue(2);
    (access.canAssignRole as MFn).mockReturnValue(true);
    (access.isSuperAdmin as MFn).mockReturnValue(false);
    (companyModel.getCompanyById as MFn).mockResolvedValue({ activo: true });
  });

  describe("listUsersHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await listUsersHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns list for Admin", async () => {
      (userModel.listUsers as MFn).mockResolvedValue([mockDbUser]);
      const res = mockRes();
      await listUsersHandler({ user: mockAdmin, query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it("returns list for SuperAdmin with optional id_empresa filter", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.listUsers as MFn).mockResolvedValue([mockDbUser]);
      const res = mockRes();
      await listUsersHandler({ user: mockSuperAdmin, query: { id_empresa: "5", include_inactive: "true" } } as any, res);
      expect(userModel.listUsers).toHaveBeenCalledWith(expect.objectContaining({ includeInactive: true }));
    });
  });

  describe("getUserHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await getUserHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getUserHandler({ user: mockAdmin, params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getUserHandler({ user: mockAdmin, params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns user when found", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      const res = mockRes();
      await getUserHandler({ user: mockAdmin, params: { id: "2" } } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it("lets SuperAdmin see any user", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (requestScope.parseNumericId as MFn).mockReturnValue(99);
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id_empresa: null });
      const res = mockRes();
      await getUserHandler({ user: mockSuperAdmin, params: { id: "99" } } as any, res);
      expect(userModel.getUserById).toHaveBeenCalledWith(99, undefined);
    });
  });

  describe("createUserHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await createUserHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when fields missing", async () => {
      const res = mockRes();
      await createUserHandler({ user: mockAdmin, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "invalid_request" });
    });

    it("returns 403 when role forbidden (Admin can't create SuperAdmin)", async () => {
      (access.canAssignRole as MFn).mockReturnValue(false);
      const res = mockRes();
      await createUserHandler({ user: mockAdmin, body: { nombre: "T", email: "t@t.com", password: "p", rol: "SuperAdmin" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when non-SuperAdmin user without empresa (SuperAdmin sin empresa creando Vendedor sin id_empresa)", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await createUserHandler({
        user: { ...mockSuperAdmin, empresaId: null },
        body: { nombre: "T", email: "t@t.com", password: "p", rol: "Vendedor" }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when empresa is invalid", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(5);
      (companyModel.getCompanyById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await createUserHandler({
        user: mockSuperAdmin, body: { nombre: "T", email: "t@t.com", password: "p", rol: "Vendedor", id_empresa: 5 }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_invalida" });
    });

    it("creates Vendedor and returns 201", async () => {
      (userModel.createUser as MFn).mockResolvedValue(mockDbUser);
      const res = mockRes();
      await createUserHandler({ user: mockAdmin, body: { nombre: "T", email: "t@t.com", password: "p", rol: "Vendedor", id_empresa: 1 } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates SuperAdmin (by SuperAdmin)", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      (userModel.createUser as MFn).mockResolvedValue({ ...mockDbUser, rol: "SuperAdmin", id_empresa: null });
      const res = mockRes();
      await createUserHandler({
        user: mockSuperAdmin, body: { nombre: "SA", email: "sa2@sa.com", password: "p", rol: "SuperAdmin" }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateUserHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await updateUserHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when target not found", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "99" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when Admin tries to update SuperAdmin", async () => {
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, rol: "SuperAdmin" });
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "2" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "forbidden_target" });
    });

    it("returns 400 when deactivating self", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(1);
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id: "1" });
      const res = mockRes();
      await updateUserHandler({ user: { ...mockAdmin, rol: "SuperAdmin" as const, id: 1 }, params: { id: "1" }, body: { activo: false } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cannot_deactivate_self" });
    });

    it("returns 400 when nombre explicitly cleared", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "2" }, body: { nombre: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("returns 400 when email explicitly cleared", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "2" }, body: { email: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_required" });
    });

    it("returns 400 when rol is invalid", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "2" }, body: { rol: "Hacker" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "rol_invalido" });
    });

    it("returns 403 when role escalation via update", async () => {
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      (access.canAssignRole as MFn).mockReturnValue(false);
      const res = mockRes();
      await updateUserHandler({ user: mockAdmin, params: { id: "2" }, body: { rol: "SuperAdmin" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when empresa is invalid on update", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      (companyModel.getCompanyById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateUserHandler({ user: mockSuperAdmin, params: { id: "2" }, body: { id_empresa: 99 } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_invalida" });
    });

    it("updates user successfully", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue(mockDbUser);
      (userModel.updateUser as MFn).mockResolvedValue({ ...mockDbUser, nombre: "Updated" });
      const res = mockRes();
      await updateUserHandler({
        user: mockSuperAdmin, params: { id: "2" },
        body: { nombre: "Updated", email: "updated@t.com", password: "newpwd", rol: "Admin", id_empresa: 2 }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });
  });

  describe("deactivateUserHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await deactivateUserHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when deactivating self", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(1);
      const res = mockRes();
      await deactivateUserHandler({ user: { id: 1 }, params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cannot_deactivate_self" });
    });

    it("returns 404 when target not found", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await deactivateUserHandler({ user: mockSuperAdmin, params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when Admin deactivates SuperAdmin", async () => {
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id: "2", rol: "SuperAdmin" });
      const res = mockRes();
      await deactivateUserHandler({ user: mockAdmin, params: { id: "2" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "forbidden_target" });
    });

    it("deactivates user successfully", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id: "2" });
      (userModel.deactivateUser as MFn).mockResolvedValue(true);
      const res = mockRes();
      await deactivateUserHandler({ user: mockSuperAdmin, params: { id: "2" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe("unlockUserHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await unlockUserHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when target not found", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await unlockUserHandler({ user: mockSuperAdmin, params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when Admin unlocks SuperAdmin", async () => {
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id: "2", rol: "SuperAdmin" });
      const res = mockRes();
      await unlockUserHandler({ user: mockAdmin, params: { id: "2" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "forbidden_target" });
    });

    it("unlocks user successfully", async () => {
      (access.isSuperAdmin as MFn).mockReturnValue(true);
      (userModel.getUserById as MFn).mockResolvedValue({ ...mockDbUser, id: "2" });
      (userModel.unlockUser as MFn).mockResolvedValue({ ...mockDbUser, id: "2" });
      const res = mockRes();
      await unlockUserHandler({ user: mockSuperAdmin, params: { id: "2" } } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });
  });
});
