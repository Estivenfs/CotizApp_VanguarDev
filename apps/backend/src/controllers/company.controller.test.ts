import {
  listCompaniesHandler,
  getCompanyHandler,
  createCompanyHandler,
  updateCompanyHandler,
  deactivateCompanyHandler
} from "./company.controller.js";

jest.mock("../models/company.model.js", () => ({
  listCompanies: jest.fn(),
  getCompanyById: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deactivateCompany: jest.fn()
}));

jest.mock("../middlewares/upload.middleware.js", () => ({
  getUploadedCompanyLogoPublicPath: jest.fn()
}));

jest.mock("../utils/file-storage.js", () => ({
  removeStoredFile: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  parseNumericId: jest.fn()
}));

import * as companyModel from "../models/company.model.js";
import * as uploadMw from "../middlewares/upload.middleware.js";
import * as requestScope from "../utils/request-scope.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockCompany = {
  id: "1", nombre: "Test Corp", logo_url: null, cuit: "30-12345678-9",
  razon_social: "Test Corp SA", direccion: "Calle 123", provincia: "CABA",
  codigo_postal: "1000", pais: "AR", telefono_contacto: "123456",
  email: "test@corp.com", website_url: null, footer_text: null, activo: true
};

const validBody = {
  nombre: "Test Corp", cuit: "30-12345678-9", razon_social: "Test Corp SA",
  direccion: "Calle 123", provincia: "CABA", codigo_postal: "1000",
  pais: "AR", telefono_contacto: "123456", email: "test@corp.com"
};

describe("company.controller", () => {
  beforeEach(() => {
    (requestScope.parseNumericId as MFn).mockReturnValue(1);
    (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue(null);
  });

  describe("listCompaniesHandler", () => {
    it("returns company list", async () => {
      (companyModel.listCompanies as MFn).mockResolvedValue([mockCompany]);
      const res = mockRes();
      await listCompaniesHandler({ query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockCompany, id: 1 }] });
    });
  });

  describe("getCompanyHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await getCompanyHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await getCompanyHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns company when found", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await getCompanyHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockCompany, id: 1 } });
    });
  });

  describe("createCompanyHandler", () => {
    it("returns 400 when nombre is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("returns 400 for invalid email", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, email: "invalid" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_invalido" });
    });

    it("creates company and returns 201", async () => {
      (companyModel.createCompany as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await createCompanyHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles duplicate cuit error", async () => {
      (companyModel.createCompany as MFn).mockRejectedValue({ code: "23505", detail: "Key (cuit)=(30-12345678-9)" });
      const res = mockRes();
      await createCompanyHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("updateCompanyHandler", () => {
    it("returns 404 when company not found", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "99" }, body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates company successfully", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      (companyModel.updateCompany as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: validBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockCompany, id: 1 } });
    });
  });

  describe("deactivateCompanyHandler", () => {
    it("returns 404 when deactivate fails", async () => {
      (companyModel.deactivateCompany as MFn).mockResolvedValue(false);
      const res = mockRes();
      await deactivateCompanyHandler({ params: { id: "99" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns ok on success", async () => {
      (companyModel.deactivateCompany as MFn).mockResolvedValue(true);
      const res = mockRes();
      await deactivateCompanyHandler({ params: { id: "1" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });
});
