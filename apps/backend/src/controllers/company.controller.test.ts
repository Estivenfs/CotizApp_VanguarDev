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
import * as fileStorage from "../utils/file-storage.js";
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

function setupNoLogo() {
  (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue(null);
}

beforeEach(() => {
  (requestScope.parseNumericId as MFn).mockReturnValue(1);
  setupNoLogo();
});

describe("company.controller", () => {
  describe("listCompaniesHandler", () => {
    it("returns company list", async () => {
      (companyModel.listCompanies as MFn).mockResolvedValue([mockCompany]);
      const res = mockRes();
      await listCompaniesHandler({ query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, items: [{ ...mockCompany, id: 1 }] });
    });

    it("passes includeInactive flag", async () => {
      (companyModel.listCompanies as MFn).mockResolvedValue([]);
      const res = mockRes();
      await listCompaniesHandler({ query: { include_inactive: "true" } } as any, res);
      expect(companyModel.listCompanies).toHaveBeenCalledWith({ includeInactive: true });
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
      await createCompanyHandler({ body: { ...validBody, nombre: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("returns 400 when cuit is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, cuit: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "cuit_required" });
    });

    it("returns 400 when razon_social is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, razon_social: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "razon_social_required" });
    });

    it("returns 400 when direccion is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, direccion: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "direccion_required" });
    });

    it("returns 400 when provincia is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, provincia: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "provincia_required" });
    });

    it("returns 400 when codigo_postal is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, codigo_postal: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "codigo_postal_required" });
    });

    it("returns 400 when pais is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, pais: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "pais_required" });
    });

    it("returns 400 when telefono_contacto is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, telefono_contacto: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "telefono_contacto_required" });
    });

    it("returns 400 when email is missing", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, email: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_required" });
    });

    it("returns 400 for invalid email", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, email: "invalid" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "email_invalido" });
    });

    it("returns 400 for invalid website_url", async () => {
      const res = mockRes();
      await createCompanyHandler({ body: { ...validBody, website_url: "not-a-url" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "website_url_invalida" });
    });

    it("creates company and returns 201", async () => {
      (companyModel.createCompany as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await createCompanyHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates company with logo upload", async () => {
      (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue("/uploads/company-logos/logo.jpg");
      (companyModel.createCompany as MFn).mockResolvedValue({ ...mockCompany, logo_url: "/uploads/company-logos/logo.jpg" });
      const res = mockRes();
      await createCompanyHandler({ body: validBody, file: { filename: "logo.jpg" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("cleans up logo on create error (non 23505)", async () => {
      (companyModel.createCompany as MFn).mockRejectedValue(new Error("db down"));
      const res = mockRes();
      await expect(createCompanyHandler({ body: validBody } as any, res)).rejects.toThrow("db down");
    });

    it("handles duplicate cuit error", async () => {
      (companyModel.createCompany as MFn).mockRejectedValue({ code: "23505", detail: "Key (cuit)=(30-12345678-9)" });
      const res = mockRes();
      await createCompanyHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "duplicate_cuit" });
    });

    it("handles duplicate nombre error", async () => {
      (companyModel.createCompany as MFn).mockRejectedValue({ code: "23505", detail: "Key (nombre)=(Test Corp)" });
      const res = mockRes();
      await createCompanyHandler({ body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "duplicate_nombre" });
    });

    it("cleans up logo on duplicate error", async () => {
      (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue("/uploads/company-logos/logo.jpg");
      (companyModel.createCompany as MFn).mockRejectedValue({ code: "23505", detail: "Key (cuit)=(30-12345678-9)" });
      const res = mockRes();
      await createCompanyHandler({ body: validBody, file: { filename: "logo.jpg" } } as any, res);
      expect(fileStorage.removeStoredFile).toHaveBeenCalledWith("/uploads/company-logos/logo.jpg");
    });
  });

  describe("updateCompanyHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "x" }, body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when company not found", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(null);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "99" }, body: validBody } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when nombre is missing on update", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: { ...validBody, nombre: "" } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: "nombre_required" });
    });

    it("updates company successfully", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      (companyModel.updateCompany as MFn).mockResolvedValue(mockCompany);
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: validBody } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockCompany, id: 1 } });
    });

    it("replaces logo and removes old one", async () => {
      const oldCompany = { ...mockCompany, logo_url: "/uploads/company-logos/old.jpg" };
      (companyModel.getCompanyById as MFn).mockResolvedValue(oldCompany);
      (companyModel.updateCompany as MFn).mockResolvedValue({ ...mockCompany, logo_url: "/uploads/company-logos/new.jpg" });
      (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue("/uploads/company-logos/new.jpg");
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: validBody, file: { filename: "new.jpg" } } as any, res);
      expect(fileStorage.removeStoredFile).toHaveBeenCalledWith("/uploads/company-logos/old.jpg");
    });

    it("removes logo when remove_logo flag is set", async () => {
      const oldCompany = { ...mockCompany, logo_url: "/uploads/company-logos/old.jpg" };
      (companyModel.getCompanyById as MFn).mockResolvedValue(oldCompany);
      (companyModel.updateCompany as MFn).mockResolvedValue({ ...mockCompany, logo_url: null });
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: { ...validBody, remove_logo: "true" } } as any, res);
      expect(fileStorage.removeStoredFile).toHaveBeenCalledWith("/uploads/company-logos/old.jpg");
    });

    it("toggles activo flag", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      (companyModel.updateCompany as MFn).mockResolvedValue({ ...mockCompany, activo: false });
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: { ...validBody, activo: false } } as any, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, item: { ...mockCompany, activo: false, id: 1 } });
    });

    it("cleans up logo on update error", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      (companyModel.updateCompany as MFn).mockRejectedValue(new Error("db down"));
      const res = mockRes();
      await expect(updateCompanyHandler({ params: { id: "1" }, body: validBody } as any, res)).rejects.toThrow("db down");
    });

    it("cleans up uploaded logo on duplicate error in update", async () => {
      (companyModel.getCompanyById as MFn).mockResolvedValue(mockCompany);
      (companyModel.updateCompany as MFn).mockRejectedValue({ code: "23505", detail: "Key (cuit)=..." });
      (uploadMw.getUploadedCompanyLogoPublicPath as MFn).mockReturnValue("/uploads/company-logos/new.jpg");
      const res = mockRes();
      await updateCompanyHandler({ params: { id: "1" }, body: validBody, file: { filename: "new.jpg" } } as any, res);
      expect(fileStorage.removeStoredFile).toHaveBeenCalledWith("/uploads/company-logos/new.jpg");
    });
  });

  describe("deactivateCompanyHandler", () => {
    it("returns 400 for invalid id", async () => {
      (requestScope.parseNumericId as MFn).mockReturnValue(null);
      const res = mockRes();
      await deactivateCompanyHandler({ params: { id: "x" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

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
