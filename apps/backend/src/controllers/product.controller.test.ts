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

describe("product.controller", () => {
  beforeEach(() => {
    (requestScope.getScopedCompanyId as MFn).mockReturnValue(1);
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(1);
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
  });

  it("listProducts returns list", async () => {
    (productModel.listProducts as MFn).mockResolvedValue([mockProduct]);
    const res = mockRes();
    await listProductsHandler({} as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockProduct, id: 1 }] });
  });

  it("getProduct returns 400 for invalid id", async () => {
    (requestScope.parseNumericId as MFn).mockReturnValue(null);
    const res = mockRes();
    await getProductHandler({ params: { id: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getProduct returns 404 when not found", async () => {
    (productModel.getProductById as MFn).mockResolvedValue(null);
    const res = mockRes();
    await getProductHandler({ params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("createProduct returns 400 when empresa missing", async () => {
    (requestScope.getCompanyIdForWrite as MFn).mockReturnValue(null);
    const res = mockRes();
    await createProductHandler({ body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "empresa_requerida" });
  });

  it("createProduct returns 409 on duplicate", async () => {
    (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue({ id: "1", value: "Hardware", activo: true });
    (productModel.findDuplicateProduct as MFn).mockResolvedValue("duplicate_sku");
    const res = mockRes();
    await createProductHandler({ body: validBody } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("createProduct returns 201", async () => {
    (configModel.getActiveCatalogOptionByValue as MFn).mockResolvedValue({ id: "1", value: "Hardware", activo: true });
    (productModel.findDuplicateProduct as MFn).mockResolvedValue(null);
    (productModel.createProduct as MFn).mockResolvedValue(mockProduct);
    const res = mockRes();
    await createProductHandler({ body: validBody } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("deleteProduct returns 204", async () => {
    (productModel.deleteProduct as MFn).mockResolvedValue(true);
    const res = mockRes();
    await deleteProductHandler({ params: { id: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("deleteProduct returns 404", async () => {
    (productModel.deleteProduct as MFn).mockResolvedValue(false);
    const res = mockRes();
    await deleteProductHandler({ params: { id: "99" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
