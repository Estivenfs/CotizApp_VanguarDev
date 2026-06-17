import { listTrackingEvents, addTrackingEvent } from "./tracking.controller.js";

jest.mock("../models/quote.model.js", () => ({
  getQuoteById: jest.fn(),
  listQuoteTrackingEvents: jest.fn(),
  addQuoteTrackingEvent: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn(),
  parseNumericId: jest.fn()
}));

import * as quoteModel from "../models/quote.model.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockUser = { id: 1, rol: "Vendedor" as const, empresaId: 1, nombre: "Test", email: "t@t.com", empresaNombre: "Emp" };

describe("tracking.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
    jest.clearAllMocks();
  });

  it("listTrackingEvents returns 400 for invalid id", async () => {
    (requestScope.parseNumericId as MFn).mockReturnValue(null);
    const res = mockRes();
    await listTrackingEvents({ params: { id: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("listTrackingEvents returns 404 when quote not found", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await listTrackingEvents({ params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("addTrackingEvent returns 401 when no user", async () => {
    const res = mockRes();
    await addTrackingEvent({ params: { id: "1" }, user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("addTrackingEvent returns 400 when NOTA without note", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
    const res = mockRes();
    await addTrackingEvent({ params: { id: "1" }, user: mockUser, body: { tipo_accion: "NOTA", observaciones: "" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nota_requerida" });
  });

  it("addTrackingEvent returns 201", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
    (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(200);
    const res = mockRes();
    await addTrackingEvent({ params: { id: "1" }, user: mockUser, body: { tipo_accion: "NOTA", observaciones: "hello" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, id: 200 });
  });
});
