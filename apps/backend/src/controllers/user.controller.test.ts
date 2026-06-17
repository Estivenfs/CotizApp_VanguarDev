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
import * as access from "../utils/access.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockAdminUser = { id: 1, rol: "Admin" as const, empresaId: 1, nombre: "Admin", email: "a@a.com", empresaNombre: "Emp" };
const mockDbUser = { id: "2", id_empresa: "1", nombre: "Vendedor", email: "v@v.com", rol: "Vendedor", activo: true };

describe("user.controller", () => {
  beforeEach(() => {
    (requestScope.parseNumericId as MFn).mockReturnValue(2);
    (access.canAssignRole as MFn).mockReturnValue(true);
    (access.isSuperAdmin as MFn).mockReturnValue(false);
  });

  it("listUsers returns 401 when no user", async () => {
    const res = mockRes();
    await listUsersHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("listUsers returns list", async () => {
    (userModel.listUsers as MFn).mockResolvedValue([mockDbUser]);
    const res = mockRes();
    await listUsersHandler({ user: mockAdminUser, query: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("getUser returns 404 when not found", async () => {
    (userModel.getUserById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await getUserHandler({ user: mockAdminUser, params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("createUser returns 400 when fields missing", async () => {
    const res = mockRes();
    await createUserHandler({ user: mockAdminUser, body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "invalid_request" });
  });

  it("createUser returns 403 when role forbidden", async () => {
    (access.canAssignRole as MFn).mockReturnValue(false);
    const res = mockRes();
    await createUserHandler({ user: mockAdminUser, body: { nombre: "T", email: "t@t.com", password: "p", rol: "SuperAdmin" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("createUser returns 201", async () => {
    (userModel.createUser as MFn).mockResolvedValue(mockDbUser);
    const res = mockRes();
    await createUserHandler({ user: mockAdminUser, body: { nombre: "T", email: "t@t.com", password: "p", rol: "Vendedor", id_empresa: 1 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("updateUser returns 404 when target not found", async () => {
    (userModel.getUserById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await updateUserHandler({ user: mockAdminUser, params: { id: "99" }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deactivateUser returns 400 when deactivating self", async () => {
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
    const res = mockRes();
    await deactivateUserHandler({ user: { id: 1 }, params: { id: "1" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cannot_deactivate_self" });
  });

  it("unlockUser returns 404 when user not found", async () => {
    (access.isSuperAdmin as MFn).mockReturnValue(true);
    (userModel.getUserById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await unlockUserHandler({ user: { ...mockAdminUser, rol: "SuperAdmin" as const, id: 1 }, params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
