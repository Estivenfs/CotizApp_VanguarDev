import { apiRequest } from "./apiClient";
import { env } from "../config/env";
import type { Company } from "../types";

export type CompanyUpsertInput = {
  nombre: string;
  cuit: string;
  razon_social: string;
  direccion: string;
  provincia: string;
  codigo_postal: string;
  pais: string;
  telefono_contacto: string;
  email: string;
  website_url?: string | null;
  footer_text?: string | null;
  logo?: File | null;
  remove_logo?: boolean;
};

function buildCompanyFormData(input: CompanyUpsertInput | ({ activo?: boolean } & CompanyUpsertInput)) {
  const formData = new FormData();
  formData.set("nombre", input.nombre);
  formData.set("cuit", input.cuit);
  formData.set("razon_social", input.razon_social);
  formData.set("direccion", input.direccion);
  formData.set("provincia", input.provincia);
  formData.set("codigo_postal", input.codigo_postal);
  formData.set("pais", input.pais);
  formData.set("telefono_contacto", input.telefono_contacto);
  formData.set("email", input.email);
  formData.set("website_url", input.website_url ?? "");
  formData.set("footer_text", input.footer_text ?? "");
  if ("activo" in input && typeof input.activo === "boolean") {
    formData.set("activo", String(input.activo));
  }
  if (input.remove_logo) {
    formData.set("remove_logo", "true");
  }
  if (input.logo) {
    formData.set("logo", input.logo);
  }
  return formData;
}

export function getCompanyLogoUrl(logoUrl: string | null | undefined) {
  if (!logoUrl) return null;
  return new URL(logoUrl, env.apiBaseUrl).toString();
}

export async function listCompanies(input?: { includeInactive?: boolean }) {
  const query = new URLSearchParams();
  if (input?.includeInactive) query.set("include_inactive", "true");
  const path = query.size ? `/api/companies?${query.toString()}` : "/api/companies";
  const result = await apiRequest<{ ok: true; items: Company[] }>({ path });
  return result.items;
}

export async function getCompany(id: number) {
  const result = await apiRequest<{ ok: true; item: Company }>({ path: `/api/companies/${id}` });
  return result.item;
}

export async function createCompany(input: CompanyUpsertInput) {
  const result = await apiRequest<{ ok: true; item: Company }>({
    path: "/api/companies",
    method: "POST",
    body: buildCompanyFormData(input)
  });
  return result.item;
}

export async function updateCompany(
  id: number,
  input: CompanyUpsertInput & { activo?: boolean }
) {
  const result = await apiRequest<{ ok: true; item: Company }>({
    path: `/api/companies/${id}`,
    method: "PUT",
    body: buildCompanyFormData(input)
  });
  return result.item;
}

export async function deactivateCompany(id: number) {
  await apiRequest<{ ok: true }>({
    path: `/api/companies/${id}/deactivate`,
    method: "PATCH"
  });
}
