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
import * as productModel from "../models/product.model.js";
import * as configModel from "../models/config.model.js";
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

const activeClient = {
  id: "10", nombre_empresa: "Cliente SA", cuit_tax_id: "30-123",
  contacto_principal: "Juan", clasificacion: null, email: null,
  telefono: null, direccion: null, codigo_postal: null, pais: null,
  provincia: null, estado: "Activo", ult_contacto: null
};

const activeProduct = {
  id: "20", nombre: "Product A", tipo_producto: "Hardware",
  precio_ars: "1000.00", precio_usd: "1.00", sku: "SKU-001",
  descripcion: null, estado: "Activo", garantia: "12 meses"
};

const basicBody = { id_cliente: 10, moneda: "ARS", tipo_cambio: "1" };

function setupValidCatalog() {
  (configModel.getActiveCatalogOptionByValue as MFn).mockImplementation(
    (_cid: number, tipo: string, _val: string) => Promise.resolve(tipo === "tipo_iva" ? { id: "1", value: "21" } as any : { id: "1", value: _val } as any)
  );
}

describe("quote.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockImplementation((v) => {
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
      return Number.isFinite(n) ? n : null;
    });
  });

  describe("listQuotesHandler", () => {
    it("returns list", async () => {
      (quoteModel.listQuotes as MFn).mockResolvedValue([]);
      const res = mockRes();
      await listQuotesHandler({ query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
    });

    it("filters by estado and order", async () => {
      (quoteModel.listQuotes as MFn).mockResolvedValue([]);
      const res = mockRes();
      await listQuotesHandler({
        query: { q: "test", estado: "EMITIDA", tipo_cliente: "VIP", from: "2024-01-01", to: "2024-12-31", venc_from: "2024-06-01", venc_to: "2024-06-30", order_by: "monto", order_dir: "desc" }
      } as any, res);
      expect(quoteModel.listQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ q: "test", estado: "EMITIDA", tipoCliente: "VIP", orderBy: "monto", orderDir: "desc" })
      );
    });
  });

  describe("listReactivationAlertsHandler", () => {
    it("returns alerts", async () => {
      (quoteModel.listReactivationAlerts as MFn).mockResolvedValue([]);
      const res = mockRes();
      await listReactivationAlertsHandler({} as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [] });
    });
  });

  describe("createQuoteHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await createQuoteHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await createQuoteHandler({ user: mockUser, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when required fields missing", async () => {
      const res = mockRes();
      await createQuoteHandler({ user: mockUser, body: { id_cliente: null, moneda: null, tipo_cambio: null } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "invalid_request" });
    });

    it("returns 400 for invalid global discount (>100%)", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, descuento_porcentaje_global: "150", items: [] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "descuento_global_invalido" });
    });

    it("returns 400 when items have productos but missing iva", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, items: [{ id_producto: 20, cantidad: 1 }] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "tipo_iva_requerido" });
    });

    it("returns 400 for invalid forma_pago", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (configModel.getActiveCatalogOptionByValue as MFn).mockImplementation(
        (_cid: number, tipo: string, _val: string) => {
          if (tipo === "forma_pago") return Promise.resolve(null);
          return Promise.resolve({ id: "1", value: _val } as any);
        }
      );
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, forma_pago: "bitcoin", items: [] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "forma_pago_invalida" });
    });

    it("returns 400 for invalid lugar_entrega", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (configModel.getActiveCatalogOptionByValue as MFn).mockImplementation(
        (_cid: number, tipo: string, _val: string) => {
          if (tipo === "lugar_entrega") return Promise.resolve(null);
          return Promise.resolve({ id: "1", value: _val } as any);
        }
      );
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, lugar_entrega: "marte", items: [] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "lugar_entrega_invalido" });
    });

    it("returns 400 when client not found", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(null);
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({ user: mockUser, body: { ...basicBody, items: [] } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cliente_invalido" });
    });

    it("returns 400 when client is inactive", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue({ ...activeClient, estado: "Pausado" });
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({ user: mockUser, body: { ...basicBody, items: [] } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cliente_inactivo" });
    });

    it("returns 400 when no items for non-BORRADOR", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({ user: mockUser, body: { ...basicBody, estado: "EMITIDA", items: [] } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "items_requeridos" });
    });

    it("allows BORRADOR with zero items", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (quoteModel.createQuoteTransactional as MFn).mockResolvedValue(50);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, estado: "BORRADOR", items: [] }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 when product not found", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (productModel.getProductById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, items: [{ id_producto: 99, cantidad: 1, iva_porcentaje: "21" }] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "producto_invalido" });
    });

    it("returns 400 when product is inactive", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (productModel.getProductById as MFn).mockResolvedValue({ ...activeProduct, estado: "Desactivado" });
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "21" }] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "producto_inactivo" });
    });

    it("returns 400 for invalid IVA type", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      (productModel.getProductById as MFn).mockResolvedValue(activeProduct);
      (configModel.getActiveCatalogOptionByValue as MFn).mockImplementation(
        (_cid: number, tipo: string, _val: string) => {
          if (tipo === "tipo_iva") return Promise.resolve(null);
          return Promise.resolve({ id: "1", value: _val } as any);
        }
      );
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "999" }] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "tipo_iva_invalido" });
    });

    it("returns 400 when product price is invalid", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      (productModel.getProductById as MFn).mockResolvedValue({ ...activeProduct, precio_ars: "abc" });
      setupValidCatalog();
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: { ...basicBody, items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "21" }] }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "precio_producto_invalido" });
    });

    it("creates quote successfully and returns JSON", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      (productModel.getProductById as MFn).mockResolvedValue(activeProduct);
      setupValidCatalog();
      (quoteModel.createQuoteTransactional as MFn).mockResolvedValue(50);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: {
          ...basicBody,
          items: [{ id_producto: 20, cantidad: 2, iva_porcentaje: "21" }]
        }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.ok).toBe(true);
      expect(jsonCall.id).toBe(50);
      expect(jsonCall.moneda).toBe("ARS");
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalled();
    });

    it("returns PDF when return_pdf=true", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      (productModel.getProductById as MFn).mockResolvedValue(activeProduct);
      setupValidCatalog();
      (quoteModel.createQuoteTransactional as MFn).mockResolvedValue(50);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      (pdfService.generateQuotePdfBuffer as MFn).mockResolvedValue(Buffer.from("pdf-content"));
      const res = mockRes();
      await createQuoteHandler({
        user: mockUser,
        body: {
          ...basicBody,
          return_pdf: true,
          items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "21" }]
        }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(res.send).toHaveBeenCalledWith(Buffer.from("pdf-content"));
    });
  });

  describe("getQuoteHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getQuoteHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when quote not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getQuoteHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when client not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id_cliente: "99" } as any);
      (quoteModel.listQuoteItems as MFn).mockResolvedValue([]);
      (clientModel.getClientById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getQuoteHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "client_not_found" });
    });

    it("returns quote with items and client", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id_cliente: "10", moneda: "ARS", estado: "EMITIDA" } as any);
      (quoteModel.listQuoteItems as MFn).mockResolvedValue([{ id: "1", precio_unitario_momento: "500.00" }] as any);
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      const res = mockRes();
      await getQuoteHandler({ params: { id: "1" } } as any, res);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.ok).toBe(true);
      expect(jsonCall.quote).toBeDefined();
      expect(jsonCall.client).toBeDefined();
    });
  });

  describe("updateQuoteHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateQuoteHandler({ params: { id: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when quote not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateQuoteHandler({ params: { id: "99" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("prevents going back to BORRADOR", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "EMITIDA", reactivacion_activa: 1 } as any);
      const res = mockRes();
      await updateQuoteHandler({ params: { id: "1" }, body: { estado: "BORRADOR" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "no_puede_volver_a_borrador" });
    });

    it("rejects invalid reactivacion_activa value", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "EMITIDA", reactivacion_activa: 1 } as any);
      const res = mockRes();
      await updateQuoteHandler({
        params: { id: "1" },
        body: { reactivacion_activa: 5 }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "reactivacion_activa_invalida" });
    });

    it("returns 400 when POSPUESTA without future date", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        estado: "EMITIDA", reactivacion_activa: 1 as 1 | 2 | 3,
        fecha_reactivacion_1: null, fecha_reactivacion_2: null, fecha_reactivacion_3: null
      } as any);
      const res = mockRes();
      await updateQuoteHandler({
        params: { id: "1" },
        body: { estado: "POSPUESTA", fecha_reactivacion_1: "2020-01-01" }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "fecha_reactivacion_futura_requerida" });
    });

    it("updates estado and adds tracking event", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        estado: "EMITIDA", reactivacion_activa: 1,
        fecha_reactivacion_1: null, fecha_reactivacion_2: null, fecha_reactivacion_3: null
      } as any);
      (quoteModel.updateQuote as MFn).mockResolvedValue(true);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(200);
      const res = mockRes();
      await updateQuoteHandler({
        params: { id: "1" },
        body: { estado: "CERRADA_GANADA" },
        user: mockUser
      } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "CAMBIO_ESTADO" })
      );
    });

    it("adds REPROGRAMACION_REACTIVACION tracking when dates change", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({
        estado: "EMITIDA", reactivacion_activa: 1,
        fecha_reactivacion_1: "2024-01-07T00:00:00.000Z",
        fecha_reactivacion_2: null, fecha_reactivacion_3: null
      } as any);
      (quoteModel.updateQuote as MFn).mockResolvedValue(true);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(200);
      const res = mockRes();
      await updateQuoteHandler({
        params: { id: "1" },
        body: {
          fecha_reactivacion_1: "2025-06-01T00:00:00.000Z",
          reactivacion_activa: 2
        },
        user: mockUser
      } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "REPROGRAMACION_REACTIVACION" })
      );
    });
  });

  describe("updateQuoteDraftHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await updateQuoteDraftHandler({ user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when not BORRADOR", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "EMITIDA" } as any);
      const res = mockRes();
      await updateQuoteDraftHandler({ user: mockUser, params: { id: "1" }, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "solo_borrador_editable" });
    });

    it("updates draft successfully", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "BORRADOR" } as any);
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (productModel.getProductById as MFn).mockResolvedValue(activeProduct);
      (quoteModel.updateQuoteDraftTransactional as MFn).mockResolvedValue(undefined);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      const res = mockRes();
      await updateQuoteDraftHandler({
        user: mockUser,
        params: { id: "1" },
        body: {
          id_cliente: 10, moneda: "ARS", tipo_cambio: "1",
          items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "21" }]
        }
      } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it("adds CAMBIO_ESTADO tracking when estado changes", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ estado: "BORRADOR" } as any);
      (clientModel.getClientById as MFn).mockResolvedValue(activeClient);
      setupValidCatalog();
      (productModel.getProductById as MFn).mockResolvedValue(activeProduct);
      (quoteModel.updateQuoteDraftTransactional as MFn).mockResolvedValue(undefined);
      (quoteModel.addQuoteTrackingEvent as MFn).mockResolvedValue(100);
      const res = mockRes();
      await updateQuoteDraftHandler({
        user: mockUser,
        params: { id: "1" },
        body: {
          id_cliente: 10, moneda: "ARS", tipo_cambio: "1", estado: "EMITIDA",
          items: [{ id_producto: 20, cantidad: 1, iva_porcentaje: "21" }]
        }
      } as any, res);
      expect(quoteModel.addQuoteTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: "CAMBIO_ESTADO" })
      );
    });
  });

  describe("getQuotePdfHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getQuotePdfHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when quote not found", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getQuotePdfHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns PDF buffer", async () => {
      (quoteModel.getQuoteById as MFn).mockResolvedValue({ id: "1", moneda: "ARS", estado: "EMITIDA" } as any);
      (quoteModel.listQuoteItems as MFn).mockResolvedValue([]);
      (pdfService.generateQuotePdfBuffer as MFn).mockResolvedValue(Buffer.from("pdf"));
      const res = mockRes();
      await getQuotePdfHandler({ params: { id: "1" } } as any, res);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    });
  });
});
