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

function mockUser(overrides = {}) {
  return { id: 1, rol: "Vendedor" as const, empresaId: 1, nombre: "Test", email: "t@t.com", empresaNombre: "Emp", ...overrides };
}

describe("tracking.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
    jest.clearAllMocks();
  });

  describe("listTrackingEvents", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when quote not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("auto-creates CREACION event when missing", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        id_usuario: "1", fecha_emision: "2024-01-01T00:00:00.000Z", estado: "EMITIDA"
      } as any);
      (quoteModel.listQuoteTrackingEvents as MFn)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ tipo_accion: "CREACION", id: "10", id_cotizacion: "1", id_usuario: "1" }]);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(10);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "1" } } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "CREACION" })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it("creates CREACION with id_usuario as null when missing", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        id_usuario: null, fecha_emision: null, estado: "EMITIDA"
      } as any);
      (quoteModel.listQuoteTrackingEvents as MFn)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ tipo_accion: "CREACION", id: "10", id_cotizacion: "1", id_usuario: "1" }]);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(10);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "1" } } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null })
      );
    });

    it("skips CREACION backfill when event already exists", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        id_usuario: "1", fecha_emision: "2024-01-01T00:00:00.000Z", estado: "EMITIDA"
      } as any);
      (quoteModel.listQuoteTrackingEvents as MFn).mockResolvedValue([
        { tipo_accion: "CREACION", id: "10", id_cotizacion: "1", id_usuario: "1" },
        { tipo_accion: "CAMBIO_ESTADO", id: "11", id_cotizacion: "1", id_usuario: "1" }
      ]);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "1" } } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.items.length).toBe(2);
    });

    it("maps null id_usuario correctly in response", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        id_usuario: "1", fecha_emision: "2024-01-01", estado: "EMITIDA"
      } as any);
      (quoteModel.listQuoteTrackingEvents as MFn).mockResolvedValue([
        { tipo_accion: "CREACION", id: "10", id_cotizacion: "1", id_usuario: null }
      ]);
      const res = mockRes();
      await listTrackingEvents({ params: { id: "1" } } as any, res);
      const item = (res.json as jest.Mock).mock.calls[0][0].items[0];
      expect(item.id_usuario).toBeNull();
    });
  });

  describe("addTrackingEvent", () => {
    it("returns 400 for invalid quote id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 401 when no user", async () => {
      const res = mockRes();
      await addTrackingEvent({ params: { id: "1" }, user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when quote not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "99" }, user: mockUser() } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when NOTA without note", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "1" }, user: mockUser(), body: { tipo_accion: "NOTA", observaciones: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nota_requerida" });
    });

    it("returns 400 when NOTA_EDITADA without note", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "1" }, user: mockUser(), body: { tipo_accion: "NOTA_EDITADA", observaciones: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nota_requerida" });
    });

    it("returns 400 when NOTA_EDITADA without noteKey in metadata", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      const res = mockRes();
      await addTrackingEvent({
        params: { id: "1" }, user: mockUser(),
        body: { tipo_accion: "NOTA_EDITADA", observaciones: "edited note", metadata: {} }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "note_key_requerida" });
    });

    it("creates NOTA_EDITADA with valid noteKey", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(300);
      const res = mockRes();
      await addTrackingEvent({
        params: { id: "1" }, user: mockUser(),
        body: { tipo_accion: "NOTA_EDITADA", observaciones: "edited", metadata: { noteKey: "key-123" } }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, id: 300 });
    });

    it("defaults to NOTA when tipo_accion missing", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "1" }, user: mockUser(), body: { observaciones: "default note" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "NOTA" })
      );
    });

    it("creates tracking event and returns 201", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(200);
      const res = mockRes();
      await addTrackingEvent({ params: { id: "1" }, user: mockUser(), body: { tipo_accion: "NOTA", observaciones: "hello" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, id: 200 });
    });

    it("handles custom action type without note requirement", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(150);
      const res = mockRes();
      await addTrackingEvent({
        params: { id: "1" }, user: mockUser(),
        body: { tipo_accion: "LLAMADA", observaciones: "" }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("uses observaciones field over nota", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1" } as any);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(200);
      const res = mockRes();
      await addTrackingEvent({
        params: { id: "1" }, user: mockUser(),
        body: { tipo_accion: "NOTA", observaciones: "from-obs", nota: "from-nota" }
      } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ note: "from-obs" })
      );
    });
  });
});
