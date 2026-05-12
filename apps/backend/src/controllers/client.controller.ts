import type { Request, Response } from "express";
import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  updateClient
} from "../models/client.model.js";

function parseId(value: unknown) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function listClientsHandler(_req: Request, res: Response) {
  const items = await listClients();
  res.json({
    ok: true,
    items: items.map((c) => ({
      ...c,
      id: Number(c.id)
    }))
  });
}

export async function getClientHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const item = await getClientById(id);
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function createClientHandler(req: Request, res: Response) {
  const nombre_empresa = toNullableString(req.body?.nombre_empresa);
  if (!nombre_empresa) {
    res.status(400).json({ ok: false, error: "nombre_empresa_required" });
    return;
  }

  const contacto_principal = toNullableString(req.body?.contacto_principal);
  const cuit_tax_id = toNullableString(req.body?.cuit_tax_id);
  const clasificacion = toNullableString(req.body?.clasificacion);

  const item = await createClient({
    nombre_empresa,
    contacto_principal,
    cuit_tax_id,
    clasificacion
  });

  res.status(201).json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function updateClientHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const nombre_empresa = toNullableString(req.body?.nombre_empresa);
  if (!nombre_empresa) {
    res.status(400).json({ ok: false, error: "nombre_empresa_required" });
    return;
  }

  const contacto_principal = toNullableString(req.body?.contacto_principal);
  const cuit_tax_id = toNullableString(req.body?.cuit_tax_id);
  const clasificacion = toNullableString(req.body?.clasificacion);

  const item = await updateClient(id, {
    nombre_empresa,
    contacto_principal,
    cuit_tax_id,
    clasificacion
  });

  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function deleteClientHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const deleted = await deleteClient(id);
  if (!deleted) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.status(204).send();
}
