import type { Request, Response } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct
} from "../models/product.model.js";

function parseId(value: unknown) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function parsePrice(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseStock(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    return null;
  }
  const int = Math.trunc(n);
  return int >= 0 ? int : null;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function listProductsHandler(_req: Request, res: Response) {
  const items = await listProducts();
  res.json({
    ok: true,
    items: items.map((p) => ({
      ...p,
      id: Number(p.id)
    }))
  });
}

export async function getProductHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const item = await getProductById(id);
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function createProductHandler(req: Request, res: Response) {
  const nombre = toNonEmptyString(req.body?.nombre);
  const precioArs = parsePrice(req.body?.precio_ars);
  const precioUsd = parsePrice(req.body?.precio_usd);
  const stock = parseStock(req.body?.stock);

  if (!nombre) {
    res.status(400).json({ ok: false, error: "nombre_required" });
    return;
  }

  if (precioArs === null || precioUsd === null) {
    res.status(400).json({ ok: false, error: "precio_ars_y_usd_requeridos" });
    return;
  }

  if (stock === null) {
    res.status(400).json({ ok: false, error: "stock_invalido" });
    return;
  }

  const item = await createProduct({
    nombre,
    precio_ars: String(precioArs),
    precio_usd: String(precioUsd),
    stock
  });

  res.status(201).json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function updateProductHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const nombre = toNonEmptyString(req.body?.nombre);
  const precioArs = parsePrice(req.body?.precio_ars);
  const precioUsd = parsePrice(req.body?.precio_usd);
  const stock = parseStock(req.body?.stock);

  if (!nombre) {
    res.status(400).json({ ok: false, error: "nombre_required" });
    return;
  }

  if (precioArs === null || precioUsd === null) {
    res.status(400).json({ ok: false, error: "precio_ars_y_usd_requeridos" });
    return;
  }

  if (stock === null) {
    res.status(400).json({ ok: false, error: "stock_invalido" });
    return;
  }

  const item = await updateProduct(id, {
    nombre,
    precio_ars: String(precioArs),
    precio_usd: String(precioUsd),
    stock
  });

  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function deleteProductHandler(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const deleted = await deleteProduct(id);
  if (!deleted) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.status(204).send();
}
