import { Router } from "express";
import {
  createCompanyHandler,
  deactivateCompanyHandler,
  getCompanyHandler,
  listCompaniesHandler,
  updateCompanyHandler
} from "../controllers/company.controller.js";
import { companyLogoUploadMiddleware } from "../middlewares/upload.middleware.js";

export const companyRouter = Router();

companyRouter.get("/", listCompaniesHandler);
companyRouter.get("/:id", getCompanyHandler);
companyRouter.post("/", companyLogoUploadMiddleware, createCompanyHandler);
companyRouter.put("/:id", companyLogoUploadMiddleware, updateCompanyHandler);
companyRouter.patch("/:id/deactivate", deactivateCompanyHandler);
