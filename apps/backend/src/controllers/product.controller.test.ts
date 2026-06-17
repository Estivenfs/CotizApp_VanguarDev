import {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler
} from "./product.controller.js";

jest.mock("../models/product.model.js", () => ({
  listProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  findDuplicateProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn()
}));

jest.mock("../models/config.model.js", () => ({
  getActiveCatalogOptionByValue: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn(),
  getCompanyIdForWrite: jest.fn(),
  parseNumericId: jest.fn()
}));

import * as productModel from "../models/product.model.js";
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

const mockProduct = {
  id: "1", nombre: "Product A", tipo_producto: "Hardware",
  precio_ars: "1000.00", precio_usd: "1.00", sku: "SKU-001",
  descripcion: null, estado: "Activo", garantia: "12 meses"
};

const validBody = {
  nombre: "Product A", tipo_producto: "Hardware", precio_ars: 1000,
  precio_usd: 1, sku: "SKU-001", garantia: "12 meses"
};

function setupValidCatalog() {
  (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue({ id: "1", value: "Hardware" } as any);
}

describe("product.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  describe("listProductsHandler", () => {
    it("returns list", async () => {
      (productModel.listProducts as MFn).mockResolvedValue([mockProduct]);
      const res = mockRes();
      await listProductsHandler({} as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockProduct, id: 1 }] });
    });
  });

  describe("getProductHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getProductHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      (productModel.getProductById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getProductHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns product when found", async () => {
      (productModel.getProductById as MFn).mockResolvedValue(mockProduct);
      const res = mockRes();
      await getProductHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockProduct, id: 1 } });
    });
  });

  describe("createProductHandler", () => {
    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await createProductHandler({ body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when nombre missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, nombre: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("returns 400 when sku missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, sku: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "sku_required" });
    });

    it("returns 400 when tipo_producto missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, tipo_producto: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "tipo_producto_required" });
    });

    it("returns 400 when garantia missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, garantia: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "garantia_required" });
    });

    it("returns 400 when garantia is sin garantia", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, garantia: "Sin garantia" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "garantia_required" });
    });

    it("returns 400 when garantia is sin garantía (accented)", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, garantia: "Sin garantía" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "garantia_required" });
    });

    it("returns 400 when precio_ars missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, precio_ars: undefined } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "precio_ars_y_usd_requeridos" });
    });

    it("returns 400 when precio_usd missing", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, precio_usd: undefined } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "precio_ars_y_usd_requeridos" });
    });

    it("returns 400 when estado is invalid", async () => {
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, estado: "Eliminado" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "estado_invalido" });
    });

    it("returns 400 when tipo_producto is invalid in catalog", async () => {
      (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue(null);
      const res = mockRes();
      await createProductHandler({ body: validBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "tipo_producto_invalido" });
    });

    it("returns 409 on duplicate_nombre", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue("duplicate_nombre");
      const res = mockRes();
      await createProductHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 on duplicate_sku", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue("duplicate_sku");
      const res = mockRes();
      await createProductHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("creates product and returns 201", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue(null);
      (productModel.createProduct as MFn).mockResolvedValue(mockProduct);
      const res = mockRes();
      await createProductHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockProduct, id: 1 } });
    });

    it("handles estado default when not provided", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue(null);
      (productModel.createProduct as MFn).mockResolvedValue({ ...mockProduct, estado: "Activo" });
      const res = mockRes();
      await createProductHandler({ body: { ...validBody, estado: undefined } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateProductHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateProductHandler({ params: { id: "x" }, body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when empresa missing", async () => {
      (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateProductHandler({ params: { id: "1" }, body: validBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
    });

    it("returns 400 when nombre missing", async () => {
      const res = mockRes();
      await updateProductHandler({ params: { id: "1" }, body: { ...validBody, nombre: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("returns 400 when sku missing", async () => {
      const res = mockRes();
      await updateProductHandler({ params: { id: "1" }, body: { ...validBody, sku: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "sku_required" });
    });

    it("returns 404 when update returns null", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue(null);
      (productModel.updateProduct as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateProductHandler({ params: { id: "99" }, body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates product successfully", async () => {
      setupValidCatalog();
      (productModel.findDuplicateProduct as MFn).mockResolvedValue(null);
      (productModel.updateProduct as MFn).mockResolvedValue(mockProduct);
      const res = mockRes();
      await updateProductHandler({ params: { id: "1" }, body: validBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockProduct, id: 1 } });
    });
  });

  describe("deleteProductHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await deleteProductHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 204 on success", async () => {
      (productModel.deleteProduct as MFn).mockResolvedValue(true);
      const res = mockRes();
      await deleteProductHandler({ params: { id: "1" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when not found", async () => {
      (productModel.deleteProduct as MFn).mockResolvedValue(false);
      const res = mockRes();
      await deleteProductHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
