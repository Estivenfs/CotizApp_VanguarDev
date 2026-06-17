import {
  listClientsHandler,
  getClientHandler,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
  listClientContactsHandler,
  createClientContactHandler
} from "./client.controller.js";

jest.mock("../models/client.model.js", () => ({
  listClients: jest.fn(),
  getClientById: jest.fn(),
  listClientQuotes: jest.fn(),
  listClientReactivations: jest.fn(),
  createClient: jest.fn(),
  findDuplicateClient: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
  listClientContacts: jest.fn(),
  createClientContact: jest.fn()
}));

jest.mock("../models/config.model.js", () => ({
  getActiveCatalogOptionByValue: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn(),
  getCompanyIdForWrite: jest.fn(),
  parseNumericId: jest.fn()
}));

import * as clientModel from "../models/client.model.js";
import * as requestScope from "../utils/request-scope.js";

type MockedFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

const mockClient = {
  id: "1", nombre_empresa: "Test SA", cuit_tax_id: "30-12345678-9",
  contacto_principal: "Juan", clasificacion: null, email: null,
  telefono: null, direccion: null, codigo_postal: null, pais: null,
  provincia: null, estado: "Activo", ult_contacto: null
};

describe("client.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MockedFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MockedFn).mockReturnValue(1);
    (requestScope.parseNumericId as MockedFn).mockReturnValue(1);
  });

  describe("listClientsHandler", () => {
    it("returns client list with numeric ids", async () => {
      (clientModel.listClients as MockedFn).mockResolvedValue([mockClient]);
      const res = mockRes();
      await listClientsHandler({} as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockClient, id: 1 }] });
    });
  });

  describe("getClientHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MockedFn).mockReturnValue(null);
      const res = mockRes();
      await getClientHandler({ params: { id: "abc" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when client not found", async () => {
      (clientModel.getClientById as MockedFn).mockResolvedValue(null);
      const res = mockRes();
      await getClientHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns client with quotes and reactivations", async () => {
      (clientModel.getClientById as MockedFn).mockResolvedValue(mockClient);
      (clientModel.listClientQuotes as MockedFn).mockResolvedValue([]);
      (clientModel.listClientReactivations as MockedFn).mockResolvedValue([]);
      const res = mockRes();
      await getClientHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockClient, id: 1 }, quotes: [], reactivations: [] });
    });
  });

  describe("createClientHandler", () => {
    it("returns 400 when empresa is missing", async () => {
      (requestScope.getCompanyIdForWrite as MockedFn).mockReturnValue(null);
      const res = mockRes();
      await createClientHandler({ body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when nombre_empresa missing", async () => {
      const res = mockRes();
      await createClientHandler({ body: { cuit_tax_id: "30-123" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_empresa_required" });
    });

    it("returns 409 on duplicate", async () => {
      (clientModel.findDuplicateClient as MockedFn).mockResolvedValue("duplicate_nombre");
      const res = mockRes();
      await createClientHandler({ body: { nombre_empresa: "Test", cuit_tax_id: "30-123" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("creates client and returns 201", async () => {
      (clientModel.findDuplicateClient as MockedFn).mockResolvedValue(null);
      (clientModel.createClient as MockedFn).mockResolvedValue(mockClient);
      const res = mockRes();
      await createClientHandler({ body: { nombre_empresa: "Test", cuit_tax_id: "30-123" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateClientHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MockedFn).mockReturnValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when update returns null", async () => {
      (clientModel.findDuplicateClient as MockedFn).mockResolvedValue(null);
      (clientModel.updateClient as MockedFn).mockResolvedValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { nombre_empresa: "Test", cuit_tax_id: "30-123" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("deleteClientHandler", () => {
    it("returns 204 on successful delete", async () => {
      (clientModel.deleteClient as MockedFn).mockResolvedValue(true);
      const res = mockRes();
      await deleteClientHandler({ params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when delete returns false", async () => {
      (clientModel.deleteClient as MockedFn).mockResolvedValue(false);
      const res = mockRes();
      await deleteClientHandler({ params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listClientContactsHandler", () => {
    it("returns 404 when client not found", async () => {
      (clientModel.getClientById as MockedFn).mockResolvedValue(null);
      const res = mockRes();
      await listClientContactsHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("createClientContactHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: {}, user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when fecha_contacto missing", async () => {
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: {}, user: { id: 1, rol: "Vendedor", empresaId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "fecha_contacto_invalida" });
    });
  });
});
