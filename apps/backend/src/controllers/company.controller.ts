import type { Request, Response } from "express";
import {
  createCompany,
  deactivateCompany,
  getCompanyById,
  listCompanies,
  updateCompany
} from "../models/company.model.js";
import { getUploadedCompanyLogoPublicPath } from "../middlewares/upload.middleware.js";
import { removeStoredFile } from "../utils/file-storage.js";
import { parseNumericId } from "../utils/request-scope.js";

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWebsiteUrl(value: string | null | undefined) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getCompanyPayload(req: Request) {
  return {
    nombre: toNonEmptyString(req.body?.nombre),
    cuit: toNonEmptyString(req.body?.cuit),
    razon_social: toNonEmptyString(req.body?.razon_social),
    direccion: toNonEmptyString(req.body?.direccion),
    provincia: toNonEmptyString(req.body?.provincia),
    codigo_postal: toNonEmptyString(req.body?.codigo_postal),
    pais: toNonEmptyString(req.body?.pais),
    telefono_contacto: toNonEmptyString(req.body?.telefono_contacto),
    email: toNonEmptyString(req.body?.email),
    website_url: toOptionalString(req.body?.website_url),
    footer_text: toOptionalString(req.body?.footer_text)
  };
}

function sendValidationError(res: Response, error: string) {
  res.status(400).json({ ok: false, error });
}

function handleCompanyError(error: unknown, res: Response) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    const detail = String((error as { detail?: unknown }).detail ?? "");
    if (detail.includes("(cuit)=")) {
      res.status(409).json({ ok: false, error: "duplicate_cuit" });
      return true;
    }
    res.status(409).json({ ok: false, error: "duplicate_nombre" });
    return true;
  }
  return false;
}

export async function listCompaniesHandler(req: Request, res: Response) {
  const includeInactive = req.query?.include_inactive === "true";
  const items = await listCompanies({ includeInactive });
  res.json({
    ok: true,
    items: items.map((item) => ({ ...item, id: Number(item.id) }))
  });
}

export async function getCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const item = await getCompanyById(id);
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function createCompanyHandler(req: Request, res: Response) {
  const payload = getCompanyPayload(req);
  if (!payload.nombre) {
    sendValidationError(res, "nombre_required");
    return;
  }
  if (!payload.cuit) {
    sendValidationError(res, "cuit_required");
    return;
  }
  if (!payload.razon_social) {
    sendValidationError(res, "razon_social_required");
    return;
  }
  if (!payload.direccion) {
    sendValidationError(res, "direccion_required");
    return;
  }
  if (!payload.provincia) {
    sendValidationError(res, "provincia_required");
    return;
  }
  if (!payload.codigo_postal) {
    sendValidationError(res, "codigo_postal_required");
    return;
  }
  if (!payload.pais) {
    sendValidationError(res, "pais_required");
    return;
  }
  if (!payload.telefono_contacto) {
    sendValidationError(res, "telefono_contacto_required");
    return;
  }
  if (!payload.email) {
    sendValidationError(res, "email_required");
    return;
  }
  if (!isValidEmail(payload.email)) {
    sendValidationError(res, "email_invalido");
    return;
  }
  if (!isValidWebsiteUrl(payload.website_url)) {
    sendValidationError(res, "website_url_invalida");
    return;
  }

  const logo_url = getUploadedCompanyLogoPublicPath(req.file);

  try {
    const item = await createCompany({
      nombre: payload.nombre,
      logo_url,
      cuit: payload.cuit,
      razon_social: payload.razon_social,
      direccion: payload.direccion,
      provincia: payload.provincia,
      codigo_postal: payload.codigo_postal,
      pais: payload.pais,
      telefono_contacto: payload.telefono_contacto,
      email: payload.email,
      website_url: payload.website_url ?? null,
      footer_text: payload.footer_text ?? null
    });
    res.status(201).json({ ok: true, item: { ...item, id: Number(item.id) } });
  } catch (error) {
    removeStoredFile(logo_url);
    if (handleCompanyError(error, res)) {
      return;
    }
    throw error;
  }
}

export async function updateCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const current = await getCompanyById(id);
  if (!current) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  const payload = getCompanyPayload(req);
  if (!payload.nombre) {
    sendValidationError(res, "nombre_required");
    return;
  }
  if (!payload.cuit) {
    sendValidationError(res, "cuit_required");
    return;
  }
  if (!payload.razon_social) {
    sendValidationError(res, "razon_social_required");
    return;
  }
  if (!payload.direccion) {
    sendValidationError(res, "direccion_required");
    return;
  }
  if (!payload.provincia) {
    sendValidationError(res, "provincia_required");
    return;
  }
  if (!payload.codigo_postal) {
    sendValidationError(res, "codigo_postal_required");
    return;
  }
  if (!payload.pais) {
    sendValidationError(res, "pais_required");
    return;
  }
  if (!payload.telefono_contacto) {
    sendValidationError(res, "telefono_contacto_required");
    return;
  }
  if (!payload.email) {
    sendValidationError(res, "email_required");
    return;
  }
  if (!isValidEmail(payload.email)) {
    sendValidationError(res, "email_invalido");
    return;
  }
  if (!isValidWebsiteUrl(payload.website_url)) {
    sendValidationError(res, "website_url_invalida");
    return;
  }

  const uploadedLogoUrl = getUploadedCompanyLogoPublicPath(req.file);
  const removeLogo = req.body?.remove_logo === "true" || req.body?.remove_logo === true;
  const nextLogoUrl = uploadedLogoUrl ?? (removeLogo ? null : current.logo_url);

  try {
    const item = await updateCompany(id, {
      nombre: payload.nombre,
      logo_url: nextLogoUrl,
      cuit: payload.cuit,
      razon_social: payload.razon_social,
      direccion: payload.direccion,
      provincia: payload.provincia,
      codigo_postal: payload.codigo_postal,
      pais: payload.pais,
      telefono_contacto: payload.telefono_contacto,
      email: payload.email,
      website_url: payload.website_url ?? null,
      footer_text: payload.footer_text ?? null,
      activo: typeof req.body?.activo === "boolean" ? req.body.activo : undefined
    });

    if (!item) {
      if (uploadedLogoUrl) {
        removeStoredFile(uploadedLogoUrl);
      }
      res.status(404).json({ ok: false, error: "not_found" });
      return;
    }

    if (uploadedLogoUrl && current.logo_url && current.logo_url !== uploadedLogoUrl) {
      removeStoredFile(current.logo_url);
    }
    if (removeLogo && current.logo_url && !uploadedLogoUrl) {
      removeStoredFile(current.logo_url);
    }

    res.json({ ok: true, item: { ...item, id: Number(item.id) } });
  } catch (error) {
    if (uploadedLogoUrl) {
      removeStoredFile(uploadedLogoUrl);
    }
    if (handleCompanyError(error, res)) {
      return;
    }
    throw error;
  }
}

export async function deactivateCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const ok = await deactivateCompany(id);
  if (!ok) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true });
}
