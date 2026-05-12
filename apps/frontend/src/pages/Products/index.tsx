import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../types";
import * as productService from "../../services/product.service";
import { formatMoney } from "../../utils/currency";

type ProductDraft = {
  nombre: string;
  precio_ars: string;
  precio_usd: string;
  stock: string;
};

const emptyDraft: ProductDraft = {
  nombre: "",
  precio_ars: "",
  precio_usd: "",
  stock: "0"
};

function parseMoney(value: string) {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseStock(value: string) {
  const n = Number(value.trim());
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  return int >= 0 ? int : null;
}

function contains(value: unknown, query: string) {
  if (!query) return true;
  if (typeof value !== "string") return false;
  return value.toLowerCase().includes(query);
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((p) => {
      return contains(p.nombre, q) || String(p.id).includes(q);
    });
  }, [filter, items]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.listProducts();
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

  function startEdit(item: Product) {
    setEditingId(item.id);
    setDraft({
      nombre: item.nombre,
      precio_ars: item.precio_ars,
      precio_usd: item.precio_usd,
      stock: String(item.stock)
    });
  }

  async function onSave() {
    setError(null);
    const nombre = draft.nombre.trim();
    if (!nombre) {
      setError("La descripción es obligatoria");
      return;
    }

    const ars = parseMoney(draft.precio_ars);
    const usd = parseMoney(draft.precio_usd);
    if (ars === null || usd === null) {
      setError("Debés ingresar precios válidos en ARS y USD");
      return;
    }

    const stock = parseStock(draft.stock);
    if (stock === null) {
      setError("Stock inválido");
      return;
    }

    const payload: Omit<Product, "id"> = {
      nombre,
      precio_ars: String(ars),
      precio_usd: String(usd),
      stock
    };

    setLoading(true);
    try {
      if (editingId) {
        const updated = await productService.updateProduct(editingId, payload);
        setItems((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await productService.createProduct(payload);
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
      await productService.deleteProduct(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
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
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>Productos</h1>
          <div style={{ opacity: 0.8, fontSize: 13 }}>Catálogo bimonetario (ARS / USD) y stock</div>
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
          Nuevo producto
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <div style={{ fontWeight: 600 }}>{editingId ? `Editar SKU #${editingId}` : "Nuevo"}</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 160px 160px 120px" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Descripción</span>
            <input
              value={draft.nombre}
              onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
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
            <span>Precio ARS</span>
            <input
              value={draft.precio_ars}
              onChange={(e) => setDraft((d) => ({ ...d, precio_ars: e.target.value }))}
              inputMode="decimal"
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
            <span>Precio USD</span>
            <input
              value={draft.precio_usd}
              onChange={(e) => setDraft((d) => ({ ...d, precio_usd: e.target.value }))}
              inputMode="decimal"
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
            <span>Stock</span>
            <input
              value={draft.stock}
              onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
              inputMode="numeric"
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
          placeholder="Filtrar (SKU o descripción...)"
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <th style={{ padding: "10px 8px" }}>SKU</th>
              <th style={{ padding: "10px 8px" }}>Descripción</th>
              <th style={{ padding: "10px 8px" }}>ARS</th>
              <th style={{ padding: "10px 8px" }}>USD</th>
              <th style={{ padding: "10px 8px" }}>Stock</th>
              <th style={{ padding: "10px 8px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ars = parseMoney(p.precio_ars) ?? 0;
              const usd = parseMoney(p.precio_usd) ?? 0;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>{p.id}</td>
                  <td style={{ padding: "10px 8px" }}>{p.nombre}</td>
                  <td style={{ padding: "10px 8px" }}>{formatMoney(ars, "ARS")}</td>
                  <td style={{ padding: "10px 8px" }}>{formatMoney(usd, "USD")}</td>
                  <td style={{ padding: "10px 8px" }}>{p.stock}</td>
                  <td style={{ padding: "10px 8px", display: "flex", gap: 8 }}>
                    <button
                      disabled={loading}
                      onClick={() => startEdit(p)}
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
                      onClick={() => void onDelete(p.id)}
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
              );
            })}
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
