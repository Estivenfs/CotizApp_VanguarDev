import {
  listQuotesHandler,
  listReactivationAlertsHandler,
  createQuoteHandler,
  getQuoteHandler,
  updateQuoteHandler,
  updateQuoteDraftHandler,
  getQuotePdfHandler
} from "./quote.controller.js";

jest.mock("../models/quote.model.js", () => ({
  listQuotes: jest.fn(),
  listReactivationAlerts: jest.fn(),
  getQuoteById: jest.fn(),
  listQuoteItems: jest.fn(),
  createQuoteTransactional: jest.fn(),
  updateQuote: jest.fn(),
  updateQuoteDraftTransactional: jest.fn(),
  addQuoteTrackingEvent: jest.fn()
}));

jest.mock("../models/client.model.js", () => ({
  getClientById: jest.fn()
}));

jest.mock("../models/product.model.js", () => ({
  getProductById: jest.fn()
}));

jest.mock("../models/config.model.js", () => ({
  getActiveCatalogOptionByValue: jest.fn()
}));

jest.mock("../services/pdf.service.js", () => ({
  generateQuotePdfBuffer: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn(),
  getCompanyIdForWrite: jest.fn(),
  parseNumericId: jest.fn()
}));

import * as quoteModel from "../models/quote.model.js";
import * as clientModel from "../models/client.model.js";
import * as pdfService from "../services/pdf.service.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

const mockUser = { id: 1, rol: "Vendedor" as const, empresaId: 1, nombre: "Test", email: "t@t.com", empresaNombre: "Emp" };

describe("quote.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  it("listQuotes returns list", async () => {
    (quoteModel.listQuotes as MFn).mockResolvedValue([]);
    const res = mockRes();
    await listQuotesHandler({ query: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
  });

  it("listReactivationAlerts returns alerts", async () => {
    (quoteModel.listReactivationAlerts as MFn).mockResolvedValue([]);
    const res = mockRes();
    await listReactivationAlertsHandler({} as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
  });

  it("createQuote returns 401 when no user", async () => {
    const res = mockRes();
    await createQuoteHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("createQuote returns 400 when empresa missing", async () => {
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
    const res = mockRes();
    await createQuoteHandler({ user: mockUser, body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
  });

  it("createQuote returns 400 when required fields missing", async () => {
    const res = mockRes();
    await createQuoteHandler({ user: mockUser, body: { id_cliente: null, moneda: null, tipo_cambio: null } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "invalid_request" });
  });

  it("getQuote returns 400 for invalid id", async () => {
    (requestScope.parseNumericId as MFn).mockReturnValue(null);
    const res = mockRes();
    await getQuoteHandler({ params: { id: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getQuote returns 404 when not found", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await getQuoteHandler({ params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateQuote prevents going back to BORRADOR", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "EMITIDA", reactivacion_activa: 1 } as any);
    const res = mockRes();
    await updateQuoteHandler({ params: { id: "1" }, body: { estado: "BORRADOR" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "no_puede_volver_a_borrador" });
  });

  it("updateQuoteDraft returns 401 when no user", async () => {
    const res = mockRes();
    await updateQuoteDraftHandler({ user: undefined } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("updateQuoteDraft returns 400 when not BORRADOR", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "EMITIDA" } as any);
    const res = mockRes();
    await updateQuoteDraftHandler({ user: mockUser, params: { id: "1" }, body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "solo_borrador_editable" });
  });

  it("getQuotePdf returns PDF buffer", async () => {
    (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1", moneda: "ARS", estado: "EMITIDA" } as any);
    (quoteModel.listQuoteItems as MFn).mockResolvedValue([]);
    (pdfService.generateQuotePdfBuffer as MFn).mockResolvedValue(Buffer.from("pdf"));
    const res = mockRes();
    await getQuotePdfHandler({ params: { id: "1" } } as any, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
  });
});
