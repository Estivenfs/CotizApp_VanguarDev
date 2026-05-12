import { useEffect, useMemo, useState } from "react";
import type { Client } from "../../types";
import * as clientService from "../../services/client.service";

type ClientDraft = Omit<Client, "id">;

const emptyDraft: ClientDraft = {
  nombre_empresa: "",
  contacto_principal: "",
  cuit_tax_id: "",
  clasificacion: ""
};

function contains(value: unknown, query: string) {
  if (!query) return true;
  if (typeof value !== "string") return false;
  return value.toLowerCase().includes(query);
}

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((c) => {
      return (
        contains(c.nombre_empresa, q) ||
        contains(c.contacto_principal ?? "", q) ||
        contains(c.cuit_tax_id ?? "", q) ||
        contains(c.clasificacion ?? "", q) ||
        String(c.id).includes(q)
      );
    });
  }, [filter, items]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await clientService.listClients();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function startCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function startEdit(item: Client) {
    setEditingId(item.id);
    setDraft({
      nombre_empresa: item.nombre_empresa,
      contacto_principal: item.contacto_principal ?? "",
      cuit_tax_id: item.cuit_tax_id ?? "",
      clasificacion: item.clasificacion ?? ""
    });
  }

  async function onSave() {
    setError(null);
    const nombre = draft.nombre_empresa.trim();
    if (!nombre) {
      setError("El nombre de empresa es obligatorio");
      return;
    }

    const payload: ClientDraft = {
      nombre_empresa: nombre,
      contacto_principal: draft.contacto_principal?.trim() || null,
      cuit_tax_id: draft.cuit_tax_id?.trim() || null,
      clasificacion: draft.clasificacion?.trim() || null
    };

    setLoading(true);
    try {
      if (editingId) {
        const updated = await clientService.updateClient(editingId, payload);
        setItems((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await clientService.createClient(payload);
        setItems((prev) => [created, ...prev]);
      }
      startCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    setError(null);
    setLoading(true);
    try {
      await clientService.deleteClient(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        startCreate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "delete_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>Clientes</h1>
          <div style={{ opacity: 0.8, fontSize: 13 }}>Listado y ABM</div>
        </div>
        <button
          onClick={startCreate}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
            cursor: "pointer"
          }}
        >
          Nuevo cliente
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 620 }}>
        <div style={{ fontWeight: 600 }}>{editingId ? `Editar #${editingId}` : "Nuevo"}</div>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nombre empresa</span>
            <input
              value={draft.nombre_empresa}
              onChange={(e) => setDraft((d) => ({ ...d, nombre_empresa: e.target.value }))}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Contacto principal</span>
            <input
              value={draft.contacto_principal ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, contacto_principal: e.target.value }))}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>CUIT / Tax ID</span>
            <input
              value={draft.cuit_tax_id ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, cuit_tax_id: e.target.value }))}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Clasificación</span>
            <input
              value={draft.clasificacion ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, clasificacion: e.target.value }))}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit"
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={loading}
            onClick={() => void onSave()}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.12)",
              color: "inherit",
              cursor: "pointer"
            }}
          >
            Guardar
          </button>
          <button
            disabled={loading}
            onClick={startCreate}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          placeholder="Filtrar (empresa, contacto, CUIT, clasificación...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 520,
            padding: 10,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit"
          }}
        />
        <button
          disabled={loading}
          onClick={() => void reload()}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
            cursor: "pointer"
          }}
        >
          Actualizar
        </button>
      </div>

      {error ? <div style={{ color: "#ffb4b4" }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.75 }}>Cargando...</div> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <th style={{ padding: "10px 8px" }}>ID</th>
              <th style={{ padding: "10px 8px" }}>Empresa</th>
              <th style={{ padding: "10px 8px" }}>Contacto</th>
              <th style={{ padding: "10px 8px" }}>CUIT</th>
              <th style={{ padding: "10px 8px" }}>Clasificación</th>
              <th style={{ padding: "10px 8px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={{ padding: "10px 8px", opacity: 0.9 }}>{c.id}</td>
                <td style={{ padding: "10px 8px" }}>{c.nombre_empresa}</td>
                <td style={{ padding: "10px 8px" }}>{c.contacto_principal ?? "-"}</td>
                <td style={{ padding: "10px 8px" }}>{c.cuit_tax_id ?? "-"}</td>
                <td style={{ padding: "10px 8px" }}>{c.clasificacion ?? "-"}</td>
                <td style={{ padding: "10px 8px", display: "flex", gap: 8 }}>
                  <button
                    disabled={loading}
                    onClick={() => startEdit(c)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                      cursor: "pointer"
                    }}
                  >
                    Editar
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => void onDelete(c.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer"
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td style={{ padding: 12, opacity: 0.8 }} colSpan={6}>
                  Sin resultados
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
