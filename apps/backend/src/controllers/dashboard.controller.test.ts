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

function setupMetricsResponse() {
  (dashboardModel.getDashboardMetrics as MFn).mockResolvedValue({ clientsContacted: "5", quotesSent: "3", salesWon: "1" });
  (dashboardModel.listDashboardReactivations as MFn).mockResolvedValue([]);
}

function setupSalesSnapshot() {
  (dashboardModel.getSalesMetricsSnapshot as MFn).mockResolvedValue({
    summary: { total_sales: 0, total_quotes: 0 },
    chartData: [],
    chartGrouped: []
  });
}

describe("dashboard.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  describe("getDashboardHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await getDashboardHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns dashboard data with default period=week", async () => {
      setupMetricsResponse();
      const res = mockRes();
      await getDashboardHandler({ user: mockUser, query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          meta: expect.objectContaining({ period: "week" })
        })
      );
    });

    it("returns dashboard data with period=month", async () => {
      setupMetricsResponse();
      const res = mockRes();
      await getDashboardHandler({ user: mockUser, query: { period: "month" } } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.meta.period).toBe("month");
      expect(call.meta.reactivations_to).toBeDefined();
    });

    it("returns empty reactivations gracefully", async () => {
      (dashboardModel.getDashboardMetrics as MFn).mockResolvedValue({ clientsContacted: "0", quotesSent: "0", salesWon: "0" });
      (dashboardModel.listDashboardReactivations as MFn).mockResolvedValue([]);
      const res = mockRes();
      await getDashboardHandler({ user: mockUser, query: {} } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.ok).toBe(true);
      expect(call.reactivations).toEqual([]);
    });
  });

  describe("getSalesMetricsHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await getSalesMetricsHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns default sales metrics (last 30 days, current year)", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: {} } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.ok).toBe(true);
      expect(call.meta.used_custom_date_range).toBe(false);
      expect(call.meta.defaults.summary).toBe("last_30_days");
      expect(call.meta.defaults.charts).toBe("current_year");
    });

    it("applies custom from/to date range", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { from: "2024-01-01", to: "2024-01-31" } } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.meta.used_custom_date_range).toBe(true);
    });

    it("applies custom from only (without to)", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { from: "2024-06-01" } } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.meta.used_custom_date_range).toBe(true);
    });

    it("applies custom to only (without from)", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { to: "2024-12-31" } } as any, res);
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.meta.used_custom_date_range).toBe(true);
    });

    it("applies categoria filter", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { categoria: "Hardware" } } as any, res);
      expect(dashboardModel.getSalesMetricsSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Hardware" })
      );
    });

    it("applies tipo_cliente filter", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { tipo_cliente: "VIP" } } as any, res);
      expect(dashboardModel.getSalesMetricsSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ clientType: "VIP" })
      );
    });

    it("applies both categoria and tipo_cliente filters", async () => {
      setupSalesSnapshot();
      const res = mockRes();
      await getSalesMetricsHandler({ user: mockUser, query: { categoria: "Hardware", tipo_cliente: "VIP" } } as any, res);
      expect(dashboardModel.getSalesMetricsSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Hardware", clientType: "VIP" })
      );
    });
  });

  describe("listDashboardNotesHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await listDashboardNotesHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns notes list", async () => {
      (dashboardModel.listDashboardNotes as MFn).mockResolvedValue([]);
      const res = mockRes();
      await listDashboardNotesHandler({ user: mockUser } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
    });
  });

  describe("createDashboardNoteHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await createDashboardNoteHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when text is missing", async () => {
      const res = mockRes();
      await createDashboardNoteHandler({ user: mockUser, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "note_text_required" });
    });

    it("creates note and returns 201", async () => {
      (dashboardModel.createDashboardNote as MFn).mockResolvedValue({
        id: "10", id_usuario: "1", text: "Hello", completed: false, created_at: "..."
      });
      const res = mockRes();
      await createDashboardNoteHandler({ user: mockUser, body: { text: "Hello" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateDashboardNoteHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await updateDashboardNoteHandler({ user: undefined, params: { id: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid note id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateDashboardNoteHandler({ user: mockUser, params: { id: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when note not found", async () => {
      (dashboardModel.updateDashboardNote as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateDashboardNoteHandler({ user: mockUser, params: { id: "99" }, body: { text: "hi" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when text explicitly cleared", async () => {
      const res = mockRes();
      await updateDashboardNoteHandler({ user: mockUser, params: { id: "1" }, body: { text: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "note_text_required" });
    });

    it("toggles completed flag", async () => {
      (dashboardModel.updateDashboardNote as MFn).mockResolvedValue({
        id: "1", id_usuario: "1", text: "Note", completed: true, created_at: "..."
      });
      const res = mockRes();
      await updateDashboardNoteHandler({ user: mockUser, params: { id: "1" }, body: { completed: true } } as any, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, item: expect.objectContaining({ completed: true, id: 1 }) })
      );
    });
  });

  describe("deleteDashboardNoteHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await deleteDashboardNoteHandler({ user: undefined, params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid note id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await deleteDashboardNoteHandler({ user: mockUser, params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 204 on success", async () => {
      (dashboardModel.deleteDashboardNote as MFn).mockResolvedValue(true);
      const res = mockRes();
      await deleteDashboardNoteHandler({ user: mockUser, params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when note not found", async () => {
      (dashboardModel.deleteDashboardNote as MFn).mockResolvedValue(false);
      const res = mockRes();
      await deleteDashboardNoteHandler({ user: mockUser, params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
