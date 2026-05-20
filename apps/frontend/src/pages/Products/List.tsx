import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
import type { Product } from "../../types";
import * as productService from "../../services/product.service";
import { formatMoney } from "../../utils/currency";
import { SearchIcon, FilterIcon, DotsIcon } from "../../components/common/Icons";
import "../../styles/products.css";

function parseMoney(value: string) {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ProductsList() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Todos");
  const navigate = useNavigate();

  async function reload() {
    setLoading(true);
    try {
      const data = await productService.listProducts();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (activeTab === "Activos") result = result.filter(p => p.estado !== "Desactivado");
    if (activeTab === "Desactivados") result = result.filter(p => p.estado === "Desactivado");

    const q = filter.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        return (
          (p.nombre?.toLowerCase() || "").includes(q) ||
          (p.sku?.toLowerCase() || "").includes(q) ||
          (p.descripcion?.toLowerCase() || "").includes(q)
        );
      });
    }
    return result;
  }, [filter, items, activeTab]);

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Productos</h1>
          <div className="pageSubtitle">Visualizá y gestioná tu catálogo de productos</div>
        </div>
        <div className="productsHeaderActions">
          <Button className="btn--importExport">
            <span className="btn--importExportIcon">↑</span> Importar
          </Button>
          <Button className="btn--importExport">
            <span className="btn--importExportIcon">↓</span> Exportar lista
          </Button>
          <Button onClick={() => navigate("/products/new")} className="btn--newProduct">
            + Nuevo producto
          </Button>
        </div>
      </div>

      <div className="clientsTabs">
        <button className={`tabPill ${activeTab === "Todos" ? "tabPill--active" : ""}`} onClick={() => setActiveTab("Todos")}>Todos</button>
        <button className={`tabPill ${activeTab === "Activos" ? "tabPill--active" : ""}`} onClick={() => setActiveTab("Activos")}>Activos</button>
        <button className={`tabPill ${activeTab === "Desactivados" ? "tabPill--active" : ""}`} onClick={() => setActiveTab("Desactivados")}>Desactivados</button>
        <button className="tabPill tabPill--icon">+</button>
      </div>

      <div className="toolbar">
        <div className="searchBar">
          <input
            placeholder="Buscar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="searchIconWrapper"><SearchIcon /></div>
        </div>
        <Button className="btn--filter">
          <FilterIcon /> Filtrar
        </Button>
      </div>

      {loading ? <div className="hint">Cargando...</div> : null}

      <div className="tableWrap">
        <table className="table table--min980">
          <thead>
            <tr>
              <th className="checkboxCol"><input type="checkbox" /></th>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th className="colActions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ars = parseMoney(p.precio_ars) ?? 0;
              const usd = parseMoney(p.precio_usd) ?? 0;
              const stockLabel = p.stock === -1 ? "Ilimitado" : p.stock;
              
              return (
                <tr key={p.id}>
                  <td><input type="checkbox" /></td>
                  <td className="colName">
                    <Link className="productLink" to={`/products/${p.id}`}>
                      {p.nombre}
                    </Link>
                  </td>
                  <td>{p.sku ?? "-"}</td>
                  <td className="colDescription">
                    {p.descripcion ?? "-"}
                  </td>
                  <td>
                    <div>{formatMoney(ars, "ARS")}</div>
                    <div className="priceUsd">{formatMoney(usd, "USD")}</div>
                  </td>
                  <td>{stockLabel}</td>
                  <td>
                    <span className={`statusPill statusPill--${p.estado?.toLowerCase() === "desactivado" ? "baja" : "activo"}`}>
                      {p.estado ?? "Activo"}
                    </span>
                  </td>
                  <td className="colActions">
                    <button className="btn--actionMenu">
                      <DotsIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && !loading ? (
              <tr>
                <td className="cellEmpty colActions" colSpan={8}>
                  No se encontraron productos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
