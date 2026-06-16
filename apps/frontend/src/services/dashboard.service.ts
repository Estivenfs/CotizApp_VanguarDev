import { apiRequest } from "./apiClient";
import type { DashboardNote } from "../types";

export type DashboardPeriod = "week" | "month";

export type DashboardMetrics = {
  quotesSentCurrent: number;
  quotesSentPrevious: number;
  clientsContactedCurrent: number;
  clientsContactedPrevious: number;
  salesWonCurrent: number;
  salesWonPrevious: number;
};

export type DashboardReactivation = {
  id: number;
  id_cliente: number;
  id_usuario: number;
  fecha_emision: string;
  estado: string;
  cliente_nombre_empresa: string;
  cliente_clasificacion: string | null;
  fecha_reactivacion_activa: string;
};

export type DashboardMeta = {
  period: DashboardPeriod;
  reactivations_from: string;
  reactivations_to: string;
  notes_source: "database";
  clients_contacted_scope: "company";
  quotes_sent_source: "tracking";
  sales_won_source: "tracking";
};

export async function getDashboard(input?: { period?: DashboardPeriod }) {
  const params = new URLSearchParams();
  if (input?.period) params.set("period", input.period);
  const qs = params.toString();
  const path = qs ? `/api/dashboard?${qs}` : "/api/dashboard";

  return apiRequest<{
    ok: true;
    metrics: DashboardMetrics;
    reactivations: DashboardReactivation[];
    meta: DashboardMeta;
  }>({ path });
}

export async function listDashboardNotes() {
  const result = await apiRequest<{ ok: true; items: DashboardNote[] }>({
    path: "/api/dashboard/notes"
  });
  return result.items;
}

export async function createDashboardNote(input: { text: string }) {
  const result = await apiRequest<{ ok: true; item: DashboardNote }>({
    path: "/api/dashboard/notes",
    method: "POST",
    body: input
  });
  return result.item;
}

export async function updateDashboardNote(
  id: number,
  input: { text?: string; completed?: boolean }
) {
  const result = await apiRequest<{ ok: true; item: DashboardNote }>({
    path: `/api/dashboard/notes/${id}`,
    method: "PATCH",
    body: input
  });
  return result.item;
}

export async function deleteDashboardNote(id: number) {
  await apiRequest<void>({
    path: `/api/dashboard/notes/${id}`,
    method: "DELETE"
  });
}
