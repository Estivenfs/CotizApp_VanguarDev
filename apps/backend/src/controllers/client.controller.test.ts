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
import * as configModel from "../models/config.model.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

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

const validClientBody = { nombre_empresa: "Test SA", cuit_tax_id: "30-12345678-9" };

describe("client.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  describe("listClientsHandler", () => {
    it("returns client list", async () => {
      (clientModel.listClients as MFn).mockResolvedValue([mockClient]);
      const res = mockRes();
      await listClientsHandler({} as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockClient, id: 1 }] });
    });
  });

  describe("getClientHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getClientHandler({ params: { id: "abc" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getClientHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns client with quotes and reactivations", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(mockClient);
      (clientModel.listClientQuotes as MFn).mockResolvedValue([]);
      (clientModel.listClientReactivations as MFn).mockResolvedValue([]);
      const res = mockRes();
      await getClientHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockClient, id: 1 }, quotes: [], reactivations: [] });
    });
  });

  describe("createClientHandler", () => {
    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await createClientHandler({ body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when nombre_empresa missing", async () => {
      const res = mockRes();
      await createClientHandler({ body: { cuit_tax_id: "30-123" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_empresa_required" });
    });

    it("returns 400 when cuit_tax_id missing", async () => {
      const res = mockRes();
      await createClientHandler({ body: { nombre_empresa: "Test" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cuit_tax_id_required" });
    });

    it("returns 400 when estado is invalid", async () => {
      const res = mockRes();
      await createClientHandler({ body: { ...validClientBody, estado: "Muerto" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "estado_invalido" });
    });

    it("returns 400 when email is invalid", async () => {
      const res = mockRes();
      await createClientHandler({ body: { ...validClientBody, email: "not-an-email" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_invalido" });
    });

    it("returns 400 when clasificacion is invalid in catalog", async () => {
      (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue(null);
      const res = mockRes();
      await createClientHandler({ body: { ...validClientBody, clasificacion: "Platinum" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "clasificacion_invalida" });
    });

    it("returns 409 on duplicate_nombre", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue("duplicate_nombre");
      const res = mockRes();
      await createClientHandler({ body: validClientBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 on duplicate_cuit_tax_id", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue("duplicate_cuit_tax_id");
      const res = mockRes();
      await createClientHandler({ body: validClientBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("creates client and returns 201", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue(null);
      (clientModel.createClient as MFn).mockResolvedValue(mockClient);
      const res = mockRes();
      await createClientHandler({ body: validClientBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockClient, id: 1 } });
    });

    it("accepts valid email", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue(null);
      (clientModel.createClient as MFn).mockResolvedValue({ ...mockClient, email: "test@test.com" });
      const res = mockRes();
      await createClientHandler({ body: { ...validClientBody, email: "test@test.com" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("accepts null email as valid", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue(null);
      (clientModel.createClient as MFn).mockResolvedValue(mockClient);
      const res = mockRes();
      await createClientHandler({ body: { ...validClientBody, email: null } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateClientHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: validClientBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when nombre_empresa missing on update", async () => {
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { cuit_tax_id: "30-123" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_empresa_required" });
    });

    it("returns 400 when cuit_tax_id missing on update", async () => {
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { nombre_empresa: "Test" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cuit_tax_id_required" });
    });

    it("returns 400 when estado is invalid on update", async () => {
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { ...validClientBody, estado: "Muerto" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "estado_invalido" });
    });

    it("returns 400 when email is invalid on update", async () => {
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { ...validClientBody, email: "bad" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_invalido" });
    });

    it("returns 400 when clasificacion is invalid on update", async () => {
      (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: { ...validClientBody, clasificacion: "Fake" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "clasificacion_invalida" });
    });

    it("returns 409 on duplicate on update", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue("duplicate_cuit_tax_id");
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: validClientBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 when update returns null", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue(null);
      (clientModel.updateClient as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: validClientBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates client successfully", async () => {
      (clientModel.findDuplicateClient as MFn).mockResolvedValue(null);
      (clientModel.updateClient as MFn).mockResolvedValue(mockClient);
      const res = mockRes();
      await updateClientHandler({ params: { id: "1" }, body: validClientBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockClient, id: 1 } });
    });
  });

  describe("deleteClientHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await deleteClientHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 204 on success", async () => {
      (clientModel.deleteClient as MFn).mockResolvedValue(true);
      const res = mockRes();
      await deleteClientHandler({ params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when not found", async () => {
      (clientModel.deleteClient as MFn).mockResolvedValue(false);
      const res = mockRes();
      await deleteClientHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listClientContactsHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await listClientContactsHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when client not found", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await listClientContactsHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns contacts list", async () => {
      (clientModel.getClientById as MFn).mockResolvedValue(mockClient);
      (clientModel.listClientContacts as MFn).mockResolvedValue([
        { id: "1", id_empresa: "1", id_cliente: "1", id_usuario: "1", observacion: "test", fecha_contacto: "2024-01-01", created_at: "2024-01-01" }
      ]);
      const res = mockRes();
      await listClientContactsHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, items: expect.any(Array) }));
    });
  });

  describe("createClientContactHandler", () => {
    it("returns 401 when no user", async () => {
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: {}, user: undefined } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid client id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await createClientContactHandler({ params: { id: "x" }, body: {}, user: { id: 1, empresaId: 1 } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: {}, user: { id: 1, empresaId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when fecha_contacto missing", async () => {
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: {}, user: { id: 1, rol: "Vendedor", empresaId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "fecha_contacto_invalida" });
    });

    it("returns 400 when fecha_contacto is invalid date", async () => {
      const res = mockRes();
      await createClientContactHandler({ params: { id: "1" }, body: { fecha_contacto: "not-a-date" }, user: { id: 1, rol: "Vendedor", empresaId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "fecha_contacto_invalida" });
    });

    it("returns 404 when client not found", async () => {
      (clientModel.createClientContact as MFn).mockResolvedValue(null);
      const res = mockRes();
      await createClientContactHandler({
        params: { id: "99" },
        body: { fecha_contacto: "2024-01-01T00:00:00.000Z" },
        user: { id: 1, rol: "Vendedor", empresaId: 1 }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("creates contact and returns 201", async () => {
      (clientModel.createClientContact as MFn).mockResolvedValue({
        id: "1", id_empresa: "1", id_cliente: "1", id_usuario: "1",
        fecha_contacto: "2024-01-01T00:00:00.000Z", observacion: "Note"
      });
      const res = mockRes();
      await createClientContactHandler({
        params: { id: "1" },
        body: { fecha_contacto: "2024-01-01T00:00:00.000Z", observacion: "Note" },
        user: { id: 1, rol: "Vendedor", empresaId: 1 }
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });
  });
});
