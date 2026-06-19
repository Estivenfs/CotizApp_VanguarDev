import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useBeforeUnload } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "../../components/common/Button";
import { ErrorModal } from "../../components/common/ErrorModal";
import * as clientService from "../../services/client.service";
import * as configService from "../../services/config.service";
import { useToast } from "../../context/ToastContext";
import type { Client } from "../../types";
import { getErrorMessage } from "../../utils/feedback";
import { validarCUIT } from "../../utils/cuit";
import "../../styles/clients.css";

type ClientDraft = Omit<Client, "id">;
const fallbackClientTypeOptions = ["Cliente final", "Distribuidor"];

const emptyDraft: ClientDraft = {
  nombre_empresa: "",
  cuit_tax_id: "",
  email: "",
  telefono: "",
  direccion: "",
  codigo_postal: "",
  pais: "Argentina",
  provincia: "Buenos Aires",
  clasificacion: "Cliente final",
  estado: "Activo"
};

const clientErrorMessages: Record<string, string> = {
  nombre_empresa_required: "La razón social es obligatoria.",
  cuit_tax_id_required: "El CUIT / CUIL es obligatorio.",
  email_invalido: "Ingresá un email válido.",
  clasificacion_invalida: "El tipo de cliente seleccionado no es válido o está inactivo.",
  duplicate_nombre_empresa: "Ya existe un cliente con esa razón social en esta empresa.",
  duplicate_cuit_tax_id: "Ya existe un cliente con ese CUIT / CUIL en esta empresa.",
  estado_invalido: "El estado seleccionado no es válido."
};

const ReturnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 14L4 9M4 9L9 4M4 9H14C17.866 9 21 12.134 21 16C21 19.866 17.866 23 14 23H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function ClientCreate() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);
  const [clientTypeOptions, setClientTypeOptions] = useState<string[]>(fallbackClientTypeOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [cuitError, setCuitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [initialFormSignature, setInitialFormSignature] = useState<string | null>(null);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  function validateDraft() {
    const nombre = draft.nombre_empresa?.trim();
    if (!nombre) {
      return "El nombre / razón social es obligatorio";
    }

    const cuit = draft.cuit_tax_id?.trim();
    if (!cuit) {
      return "El CUIT / CUIL es obligatorio";
    }

    if (draft.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      return "Ingresá un email válido";
    }

    return null;
  }

  function handleCuitBlur() {
    const raw = draft.cuit_tax_id?.trim();
    if (!raw) {
      setCuitError(null);
      return;
    }
    setCuitError(validarCUIT(raw) ? null : "El CUIT / CUIL ingresado no es válido");
  }

  useEffect(() => {
    async function loadClientTypes() {
      try {
        const options = await configService.listCatalogOptions({ tipo: "tipo_cliente" });
        const labels = options
          .map((option) => option.label.trim())
          .filter(Boolean);

        if (labels.length > 0) {
          setClientTypeOptions(Array.from(new Set(labels)));
        }
      } catch {
        setClientTypeOptions(fallbackClientTypeOptions);
      }
    }

    void loadClientTypes();
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadClient() {
      setLoading(true);
      setError(null);
      try {
        const client = await clientService.getClient(Number(id));
        const { id: _id, ...rest } = client;
        setDraft({
          ...emptyDraft,
          ...rest
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar cliente");
      } finally {
        setLoading(false);
      }
    }

    void loadClient();
  }, [id]);

  useEffect(() => {
    setDraft((current) => {
      const currentType = current.clasificacion?.trim();
      if (currentType) {
        return current;
      }

      return {
        ...current,
        clasificacion: clientTypeOptions[0] ?? emptyDraft.clasificacion
      };
    });
  }, [clientTypeOptions]);

  const currentFormSignature = JSON.stringify(draft);
  const hasUnsavedChanges = initialFormSignature !== null && currentFormSignature !== initialFormSignature;

  useEffect(() => {
    if (loading) return;
    if (isEditMode && !draft.nombre_empresa) return;

    if (initialFormSignature === null) {
      setInitialFormSignature(currentFormSignature);
    }
  }, [draft, loading, isEditMode, initialFormSignature, currentFormSignature]);

  useBeforeUnload((event) => {
    if (allowNavigation || loading || !hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (allowNavigation || loading || !hasUnsavedChanges || event.defaultPrevented) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;

      const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      requestNavigation(nextPath);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [allowNavigation, hasUnsavedChanges, loading]);

  function requestNavigation(path: string) {
    if (allowNavigation || loading || !hasUnsavedChanges) {
      navigate(path);
      return;
    }

    setPendingPath(path);
    setExitModalOpen(true);
  }

  async function onSave() {
    setError(null);
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      setShowErrorModal(true);
      return;
    }
    const nombre = draft.nombre_empresa.trim();

    setLoading(true);
    try {
      const payload = {
        ...draft,
        nombre_empresa: nombre
      };

      if (isEditMode && id) {
        await clientService.updateClient(Number(id), payload);
        showToast({ type: "success", text: "Cliente actualizado correctamente" });
      } else {
        await clientService.createClient(payload);
        showToast({ type: "success", text: "Cliente creado correctamente" });
      }

      setAllowNavigation(true);
      navigate("/clients");
    } catch (err) {
      const msg = getErrorMessage(err, clientErrorMessages, "No se pudo guardar el cliente");
      setError(msg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="pageHeader" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24, marginBottom: 8 }}>
        <div>
          <h1 className="pageTitle">Clientes</h1>
          <div className="pageSubtitle" style={{ marginTop: 8 }}>
            <Link to="/clients" style={{ textDecoration: "none", color: "inherit", opacity: 0.8 }}>Clientes</Link> 
            <span style={{ margin: "0 6px", opacity: 0.5 }}>›</span> 
            <span style={{ fontWeight: 600 }}>{isEditMode ? "Editar cliente" : "Agregar nuevo cliente"}</span>
          </div>
        </div>
        <div className="actions">
          <Button onClick={() => requestNavigation("/clients")} className="btn--ghost" style={{ border: "none", fontWeight: 600, display: "flex", gap: 8 }}>
            <ReturnIcon /> Volver
          </Button>
        </div>
      </div>

      <div className="stack">
        <div className="sectionTitle" style={{ marginTop: 8 }}>Datos generales</div>
        <div className="divider" />
        
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <label className="field">
            <span className="label">Nombre / Razón Social<span className="required">*</span></span>
            <input
              value={draft.nombre_empresa}
              onChange={(e) => setDraft((d) => ({ ...d, nombre_empresa: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">CUIT / CUIL<span className="required">*</span></span>
            <input
              value={draft.cuit_tax_id ?? ""}
              onChange={(e) => {
                setDraft((d) => ({ ...d, cuit_tax_id: e.target.value }));
                if (cuitError) setCuitError(null);
              }}
              onBlur={handleCuitBlur}
              className="input"
            />
            {cuitError ? <span className="fieldError">{cuitError}</span> : null}
          </label>
          <label className="field">
            <span className="label">Tipo</span>
            <select
              value={draft.clasificacion ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, clasificacion: e.target.value }))}
              className="select"
            >
              {clientTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="sectionTitle">Contacto</div>
        <div className="divider" />

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <label className="field">
            <span className="label">Email</span>
            <input
              value={draft.email ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              className="input"
              type="email"
            />
          </label>
          <label className="field">
            <span className="label">Teléfono</span>
            <input
              value={draft.telefono ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, telefono: e.target.value }))}
              className="input"
            />
          </label>
        </div>

        <div className="sectionTitle">Ubicación</div>
        <div className="divider" />

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <label className="field">
            <span className="label">País</span>
            <select
              value={draft.pais ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, pais: e.target.value }))}
              className="select"
            >
              <option value="Argentina">Argentina</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Chile">Chile</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Provincia</span>
            <select
              value={draft.provincia ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, provincia: e.target.value }))}
              className="select"
            >
              <option value="Buenos Aires">Buenos Aires</option>
              <option value="Catamarca">Catamarca</option>
              <option value="Chaco">Chaco</option>
              <option value="Chubut">Chubut</option>
              <option value="Ciudad Autónoma de Buenos Aires (CABA)">Ciudad Autónoma de Buenos Aires (CABA)</option>
              <option value="Córdoba">Córdoba</option>
              <option value="Corrientes">Corrientes</option>
              <option value="Entre Ríos">Entre Ríos</option>
              <option value="Formosa">Formosa</option>
              <option value="Jujuy">Jujuy</option>
              <option value="La Pampa">La Pampa</option>
              <option value="La Rioja">La Rioja</option>
              <option value="Mendoza">Mendoza</option>
              <option value="Misiones">Misiones</option>
              <option value="Neuquén">Neuquén</option>
              <option value="Río Negro">Río Negro</option>
              <option value="Salta">Salta</option>
              <option value="San Juan">San Juan</option>
              <option value="San Luis">San Luis</option>
              <option value="Santa Cruz">Santa Cruz</option>
              <option value="Santa Fe">Santa Fe</option>
              <option value="Santiago del Estero">Santiago del Estero</option>
              <option value="Tierra del Fuego, Antártida e Islas del Atlántico Sur">
                Tierra del Fuego, Antártida e Islas del Atlántico Sur
              </option>
              <option value="Tucumán">Tucumán</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Código Postal</span>
            <input
              value={draft.codigo_postal ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, codigo_postal: e.target.value }))}
              className="input"
            />
          </label>
          <label className="field">
            <span className="label">Dirección</span>
            <input
              value={draft.direccion ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, direccion: e.target.value }))}
              className="input"
            />
          </label>
        </div>

        <div className="newActions">
          <Button disabled={loading} onClick={() => void onSave()} className="btn--primary minw-170">
            {isEditMode ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>

        {error ? <div className="error" style={{ marginTop: 16 }}>{error}</div> : null}
      </div>

      <ErrorModal
        open={showErrorModal}
        message={error ?? ""}
        onClose={() => { setShowErrorModal(false); setError(null); }}
      />

      {exitModalOpen
        ? createPortal(
            <div className="modalOverlay" onClick={() => null}>
              <div className="modalContent" onClick={(e) => e.stopPropagation()}>
                <h3>Abandonar {isEditMode ? "edición" : "creación"}</h3>
                <p>Tenés cambios sin guardar. ¿Seguro que deseas salir?</p>
                <div className="modalActions" style={{ marginTop: 24 }}>
                  <Button
                    onClick={() => {
                      setExitModalOpen(false);
                      setPendingPath(null);
                    }}
                    className="btn--ghost"
                  >
                    Seguir editando
                  </Button>
                  <Button
                    onClick={() => {
                      setAllowNavigation(true);
                      setExitModalOpen(false);
                      navigate(pendingPath ?? "/clients");
                    }}
                    className="btn--danger"
                  >
                    Salir sin guardar
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
