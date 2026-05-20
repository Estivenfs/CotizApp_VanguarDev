import { Route, Routes } from "react-router-dom";
import { ProductsList } from "./List";
import { ProductCreate } from "./Create";

export default function ProductsPage() {
  return (
    <div className="page">
      <div>
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Productos</h1>
          <div className="pageSubtitle">Catálogo bimonetario (ARS / USD) y stock</div>
        </div>
        <Button onClick={startCreate} className="btn--primary">
          + Nuevo producto
        </Button>
      </div>

      <div className="stack maxw-720">
        <div className="sectionTitle">{editingId ? `Editar SKU #${editingId}` : "Nuevo"}</div>
        <div className="formGrid formGrid--4">
          <label className="field">
            <span className="label">Descripción</span>
            <input
              value={draft.nombre}
              onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Precio ARS</span>
            <input
              value={draft.precio_ars}
              onChange={(e) => setDraft((d) => ({ ...d, precio_ars: e.target.value }))}
              inputMode="decimal"
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Precio USD</span>
            <input
              value={draft.precio_usd}
              onChange={(e) => setDraft((d) => ({ ...d, precio_usd: e.target.value }))}
              inputMode="decimal"
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Stock</span>
            <input
              value={draft.stock}
              onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
              inputMode="numeric"
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

      <div className="filterToolbar">
        <input
          placeholder="Filtrar (SKU o descripción...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="searchBarInput"
        />
        <Button disabled={loading} onClick={() => void reload()} className="btn--ghost">
          Actualizar
        </Button>
      </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="hint">Cargando...</div> : null}

      <div className="tableWrap">
        <table className="table table--min820">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Descripción</th>
              <th>ARS</th>
              <th>USD</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ars = parseMoney(p.precio_ars) ?? 0;
              const usd = parseMoney(p.precio_usd) ?? 0;
              return (
                <tr key={p.id}>
                  <td className="cellMuted">{p.id}</td>
                  <td>{p.nombre}</td>
                  <td>{formatMoney(ars, "ARS")}</td>
                  <td>{formatMoney(usd, "USD")}</td>
                  <td>{p.stock}</td>
                  <td className="row">
                    <Button disabled={loading} onClick={() => startEdit(p)} className="btn--sm">
                      Editar
                    </Button>
                    <Button disabled={loading} onClick={() => void onDelete(p.id)} className="btn--sm btn--ghost">
                      Eliminar
                    </Button>
                  </td>
                </tr>
              );
            })}
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
