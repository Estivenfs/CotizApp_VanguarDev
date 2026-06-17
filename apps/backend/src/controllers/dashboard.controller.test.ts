import {
  getDashboardHandler,
  getSalesMetricsHandler,
  listDashboardNotesHandler,
  createDashboardNoteHandler,
  updateDashboardNoteHandler,
  deleteDashboardNoteHandler
} from "./dashboard.controller.js";

jest.mock("../models/dashboard.model.js", () => ({
  getDashboardMetrics: jest.fn(),
  listDashboardReactivations: jest.fn(),
  getSalesMetricsSnapshot: jest.fn(),
  listDashboardNotes: jest.fn(),
  createDashboardNote: jest.fn(),
  updateDashboardNote: jest.fn(),
  deleteDashboardNote: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn(),
  parseNumericId: jest.fn(),
  getCompanyIdForWrite: jest.fn()
}));

import * as dashboardModel from "../models/dashboard.model.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

const mockUser = { id: 1, rol: "Vendedor" as const, empresaId: 1, nombre: "Test", email: "t@t.com", empresaNombre: "Emp" };

describe("dashboard.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  it("getDashboard returns 401 when no user", async () => {
    const res = mockRes();
    await getDashboardHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getDashboard returns data", async () => {
    (dashboardModel.getDashboardMetrics as MFn).mockResolvedValue({ clientsContacted: "5" });
    (dashboardModel.listDashboardReactivations as MFn).mockResolvedValue([]);
    const res = mockRes();
    await getDashboardHandler({ user: mockUser, query: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("getSalesMetrics returns 401 when no user", async () => {
    const res = mockRes();
    await getSalesMetricsHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getSalesMetrics returns snapshot", async () => {
    (dashboardModel.getSalesMetricsSnapshot as MFn).mockResolvedValue({ summary: {} } as any);
    const res = mockRes();
    await getSalesMetricsHandler({ user: mockUser, query: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("listNotes returns 401 when no user", async () => {
    const res = mockRes();
    await listDashboardNotesHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("listNotes returns notes", async () => {
    (dashboardModel.listDashboardNotes as MFn).mockResolvedValue([]);
    const res = mockRes();
    await listDashboardNotesHandler({ user: mockUser } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
  });

  it("createNote returns 400 without text", async () => {
    const res = mockRes();
    await createDashboardNoteHandler({ user: mockUser, body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "note_text_required" });
  });

  it("createNote returns 201", async () => {
    (dashboardModel.createDashboardNote as MFn).mockResolvedValue({ id: "10", id_usuario: "1", text: "H", completed: false, created_at: "" });
    const res = mockRes();
    await createDashboardNoteHandler({ user: mockUser, body: { text: "H" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("updateNote returns 400 for invalid id", async () => {
    (requestScope.parseNumericId as MFn).mockReturnValue(null);
    const res = mockRes();
    await updateDashboardNoteHandler({ user: mockUser, params: { id: "x" }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateNote returns 404 when not found", async () => {
    (dashboardModel.updateDashboardNote as MFn).mockResolvedValue(null);
    const res = mockRes();
    await updateDashboardNoteHandler({ user: mockUser, params: { id: "99" }, body: { text: "hi" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deleteNote returns 204", async () => {
    (dashboardModel.deleteDashboardNote as MFn).mockResolvedValue(true);
    const res = mockRes();
    await deleteDashboardNoteHandler({ user: mockUser, params: { id: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("deleteNote returns 404", async () => {
    (dashboardModel.deleteDashboardNote as MFn).mockResolvedValue(false);
    const res = mockRes();
    await deleteDashboardNoteHandler({ user: mockUser, params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
