import type { Request, Response } from "express";
import {
  createDashboardNote,
  deleteDashboardNote,
  getDashboardMetrics,
  listDashboardNotes,
  listDashboardReactivations,
  updateDashboardNote
} from "../models/dashboard.model.js";
import { getScopedCompanyId, parseNumericId } from "../utils/request-scope.js";

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function addUtcDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function endOfCurrentUtcWeekExclusive(date: Date) {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + daysUntilNextMonday);
  return next;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function getDashboardHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const period = req.query?.period === "month" ? "month" : "week";
  const now = new Date();

  const metricsEnd = now;
  const metricsStart = addUtcDays(metricsEnd, -30);
  const previousMetricsEnd = metricsStart;
  const previousMetricsStart = addUtcDays(previousMetricsEnd, -30);

  const reactivationStart = startOfUtcDay(now);
  const currentMonthStart = startOfUtcMonth(now);
  const nextMonthStart = addUtcMonths(currentMonthStart, 1);
  const reactivationEnd = period === "month" ? nextMonthStart : endOfCurrentUtcWeekExclusive(now);

  const companyId = getScopedCompanyId(req);
  const metrics = await getDashboardMetrics({
    companyId,
    userId: req.user.id,
    currentStartIso: metricsStart.toISOString(),
    currentEndIso: metricsEnd.toISOString(),
    previousStartIso: previousMetricsStart.toISOString(),
    previousEndIso: previousMetricsEnd.toISOString()
  });

  const reactivations = await listDashboardReactivations({
    companyId,
    userId: req.user.id,
    startIso: reactivationStart.toISOString(),
    endIso: reactivationEnd.toISOString()
  });

  res.json({
    ok: true,
    metrics,
    reactivations: reactivations.map((item) => ({
      ...item,
      id: Number(item.id),
      id_cliente: Number(item.id_cliente),
      id_usuario: Number(item.id_usuario)
    })),
    meta: {
      period,
      reactivations_from: reactivationStart.toISOString(),
      reactivations_to: reactivationEnd.toISOString(),
      notes_source: "database",
      clients_contacted_scope: "company",
      quotes_sent_source: "tracking",
      sales_won_source: "tracking"
    }
  });
}

export async function listDashboardNotesHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const items = await listDashboardNotes(req.user.id);
  res.json({
    ok: true,
    items: items.map((item) => ({
      ...item,
      id: Number(item.id),
      id_usuario: Number(item.id_usuario)
    }))
  });
}

export async function createDashboardNoteHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const text = toNullableString(req.body?.text);
  if (!text) {
    res.status(400).json({ ok: false, error: "note_text_required" });
    return;
  }

  const item = await createDashboardNote(req.user.id, text);
  res.status(201).json({
    ok: true,
    item: {
      ...item,
      id: Number(item.id),
      id_usuario: Number(item.id_usuario)
    }
  });
}

export async function updateDashboardNoteHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const noteId = parseNumericId(req.params.id);
  if (!noteId) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const rawText = req.body?.text;
  const hasText = rawText !== undefined;
  const parsedText = hasText ? toNullableString(rawText) : undefined;
  if (hasText && !parsedText) {
    res.status(400).json({ ok: false, error: "note_text_required" });
    return;
  }
  const text = parsedText ?? undefined;

  const completed =
    typeof req.body?.completed === "boolean" ? req.body.completed : undefined;

  const item = await updateDashboardNote(req.user.id, noteId, { text, completed });
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({
    ok: true,
    item: {
      ...item,
      id: Number(item.id),
      id_usuario: Number(item.id_usuario)
    }
  });
}

export async function deleteDashboardNoteHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const noteId = parseNumericId(req.params.id);
  if (!noteId) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const deleted = await deleteDashboardNote(req.user.id, noteId);
  if (!deleted) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.status(204).send();
}
