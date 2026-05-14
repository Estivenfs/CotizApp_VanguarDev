import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
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
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Clientes</h1>
          <div className="pageSubtitle">Listado y ABM</div>
        </div>
        <Button onClick={startCreate}>
          Nuevo cliente
        </Button>
      </div>

      <div className="stack maxw-620">
        <div className="nowrap sectionTitle">{editingId ? `Editar #${editingId}` : "Nuevo"}</div>
        <div className="formGrid">
          <label className="field">
            <span className="label">Nombre empresa</span>
            <input
              value={draft.nombre_empresa}
              onChange={(e) => setDraft((d) => ({ ...d, nombre_empresa: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Contacto principal</span>
            <input
              value={draft.contacto_principal ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, contacto_principal: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">CUIT / Tax ID</span>
            <input
              value={draft.cuit_tax_id ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, cuit_tax_id: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Clasificación</span>
            <input
              value={draft.clasificacion ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, clasificacion: e.target.value }))}
              className="input"
            />
          </label>
        </div>

        <div className="actions">
          <Button disabled={loading} onClick={() => void onSave()} className="btn--primary">
            Guardar
          </Button>
          <Button disabled={loading} onClick={startCreate} className="btn--ghost">
            Cancelar
          </Button>
        </div>
      </div>

      <div className="row">
        <input
          placeholder="Filtrar (empresa, contacto, CUIT, clasificación...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input filterInput"
        />
        <Button disabled={loading} onClick={() => void reload()}>
          Actualizar
        </Button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="hint">Cargando...</div> : null}

      <div className="tableWrap">
        <table className="table table--min720">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>CUIT</th>
              <th>Clasificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="cellMuted">{c.id}</td>
                <td>{c.nombre_empresa}</td>
                <td>{c.contacto_principal ?? "-"}</td>
                <td>{c.cuit_tax_id ?? "-"}</td>
                <td>{c.clasificacion ?? "-"}</td>
                <td className="row">
                  <Button disabled={loading} onClick={() => startEdit(c)} className="btn--sm">
                    Editar
                  </Button>
                  <Button disabled={loading} onClick={() => void onDelete(c.id)} className="btn--sm btn--ghost">
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="cellEmpty" colSpan={6}>
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
