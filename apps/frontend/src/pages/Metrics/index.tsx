import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Line
} from "recharts";
import { DollarSign, Briefcase, FileText, Percent, CreditCard } from "lucide-react";
import { FilterIcon } from "../../components/common/Icons";
import { Button } from "../../components/common/Button";
import "../../styles/metrics.css";
import "../../styles/dashboard.css";

// MOCK DATA
const facturacionMensualData = [
  { name: 'Ene', 'Equipos médicos': 40000, 'Insumos': 24000 },
  { name: 'Feb', 'Equipos médicos': 30000, 'Insumos': 13980 },
  { name: 'Mar', 'Equipos médicos': 20000, 'Insumos': 98000 },
  { name: 'Abr', 'Equipos médicos': 27800, 'Insumos': 39080 },
  { name: 'May', 'Equipos médicos': 18900, 'Insumos': 48000 },
  { name: 'Jun', 'Equipos médicos': 23900, 'Insumos': 38000 },
  { name: 'Jul', 'Equipos médicos': 34900, 'Insumos': 43000 },
];

const ventasAcumuladasData = [
  { name: 'Ene', Ventas: 40 },
  { name: 'Feb', Ventas: 70 },
  { name: 'Mar', Ventas: 168 },
  { name: 'Abr', Ventas: 207 },
  { name: 'May', Ventas: 255 },
  { name: 'Jun', Ventas: 293 },
  { name: 'Jul', Ventas: 336 },
];

const presupuestosDistribuidorData = [
  { name: 'Dist. Norte', value: 400 },
  { name: 'Dist. Sur', value: 300 },
  { name: 'Medical Corp', value: 300 },
  { name: 'Directo', value: 200 },
];

const COLORS = ['#7d39eb', '#a674f1', '#5627a4', '#d6bdf8', '#361866'];

export default function MetricsPage() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [distribuidorFilter, setDistribuidorFilter] = useState("");

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      <div className="stack">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Métricas</h1>
            <div className="pageSubtitle">Analizá el rendimiento de tus ventas y cotizaciones</div>
          </div>
          <div className="actions">
            <Button className="btn--ghost">Descargar PDF</Button>
            <Button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="btn--ghost" style={{ display: "flex", gap: 8 }}>
              <FilterIcon /> Filtros Globales
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="filterToolbar" style={{ padding: "16px", background: "transparent", border: "1px solid var(--border)", borderRadius: "12px", marginTop: "-8px", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", flex: 1 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Desde</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" style={{ border: "none", background: "transparent", padding: "8px 0", outline: "none", color: "var(--text-primary)", flex: 1 }} />
              <span style={{ color: "var(--text-muted)" }}>—</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 4 }}>Hasta</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" style={{ border: "none", background: "transparent", padding: "8px 0", outline: "none", color: "var(--text-primary)", flex: 1 }} />
            </div>
            <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} className="select" style={{ backgroundColor: "var(--surface)", flex: 1 }}>
              <option value="">Categoría (Todas)</option>
              <option value="Equipos">Equipos médicos</option>
              <option value="Insumos">Insumos</option>
            </select>
            <select value={distribuidorFilter} onChange={(e) => setDistribuidorFilter(e.target.value)} className="select" style={{ backgroundColor: "var(--surface)", flex: 1 }}>
              <option value="">Distribuidor / Tipo Cliente (Todos)</option>
              <option value="DistNorte">Dist. Norte</option>
              <option value="DistSur">Dist. Sur</option>
            </select>
            <Button className="btn--ghost" onClick={() => { setFromDate(""); setToDate(""); setCategoriaFilter(""); setDistribuidorFilter(""); }} style={{ flex: "0 0 auto", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px solid var(--border)" }}>
              Borrar filtros
            </Button>
          </div>
        )}

        <div className="metricsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="kpiCard kpiCard--animGradient1">
            <div className="kpiTop">
              <div className="kpiLabel">Facturación<br/><strong>TOTAL</strong></div>
              <div className="kpiBadge kpiBadge--positive">↗ +12%</div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">$345.6k</div>
              <div className="kpiIconWrap"><DollarSign size={20} /></div>
            </div>
          </div>
          
          <div className="kpiCard kpiCard--animGradient2">
            <div className="kpiTop">
              <div className="kpiLabel">Operaciones<br/><strong>Cerradas</strong></div>
              <div className="kpiBadge kpiBadge--positive">↗ +5%</div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">128</div>
              <div className="kpiIconWrap"><Briefcase size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient3">
            <div className="kpiTop">
              <div className="kpiLabel">Presupuestos<br/><strong>Enviados</strong></div>
              <div className="kpiBadge kpiBadge--negative">↘ -2%</div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">450</div>
              <div className="kpiIconWrap"><FileText size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient2">
            <div className="kpiTop">
              <div className="kpiLabel">Tasa de<br/><strong>Cierre</strong></div>
              <div className="kpiBadge kpiBadge--positive">↗ +1.2%</div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">28.4%</div>
              <div className="kpiIconWrap"><Percent size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient3">
            <div className="kpiTop">
              <div className="kpiLabel">Ticket<br/><strong>Promedio</strong></div>
              <div className="kpiBadge kpiBadge--positive">↗ +8%</div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">$2.7k</div>
              <div className="kpiIconWrap"><CreditCard size={20} /></div>
            </div>
          </div>
        </div>

        <div className="chartsGrid">
          <div className="chartCard">
            <h3 className="chartCardTitle">Facturación mensual por categoría</h3>
            <div className="chartWrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facturacionMensualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                  <Bar dataKey="Equipos médicos" stackId="a" fill="var(--primary)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Insumos" stackId="a" fill="#a674f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Ventas acumuladas del año</h3>
            <div className="chartWrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventasAcumuladasData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="Ventas" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Presupuestos enviados por distribuidor</h3>
            <div className="chartWrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={presupuestosDistribuidorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {presupuestosDistribuidorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Cantidad de Ventas (Vs. Presupuestos)</h3>
            <div className="chartWrapper">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={facturacionMensualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                  <Bar dataKey="Equipos médicos" barSize={20} fill="var(--primary)" radius={[4, 4, 0, 0]} name="Ventas" />
                  <Line type="monotone" dataKey="Insumos" stroke="#361866" strokeWidth={3} dot={{ r: 4 }} name="Presupuestos" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
