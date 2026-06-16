import crypto from "node:crypto";
import path from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";
import { buildCompanyLogoPublicPath, ensureCompanyLogoDir } from "../utils/file-storage.js";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".ico"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/ico"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, ensureCompanyLogoDir());
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${ext}`);
  }
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    callback(new Error("logo_extension_invalida"));
    return;
  }

  if (file.mimetype && !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
    callback(new Error("logo_mime_invalido"));
    return;
  }

  callback(null, true);
}

export const companyLogoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const companyLogoUploadMiddleware: RequestHandler = (req, res, next) => {
  companyLogoUpload.single("logo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ ok: false, error: "logo_too_large" });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(400).json({ ok: false, error: "logo_upload_failed" });
  });
};

export function getUploadedCompanyLogoPublicPath(file: Express.Multer.File | undefined) {
  if (!file?.filename) {
    return null;
  }
  return buildCompanyLogoPublicPath(file.filename);
}
