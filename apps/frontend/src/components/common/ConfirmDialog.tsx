import { useEffect } from "react";
import { Button } from "./Button";

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, props.onCancel]);

  if (!props.open) return null;

  const confirmClass =
    props.confirmTone === "danger" ? "btn--danger" : "btn--primary";

  return (
    <div className="modalOverlay" onClick={() => (props.loading ? null : props.onCancel())}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <h3>{props.title}</h3>
        <p>{props.message}</p>
        <div className="modalActions" style={{ marginTop: 24 }}>
          <Button onClick={props.onCancel} className="btn--ghost" disabled={props.loading}>
            {props.cancelLabel ?? "Cancelar"}
          </Button>
          <Button onClick={props.onConfirm} className={`btn--sm ${confirmClass}`} disabled={props.loading}>
            {props.loading ? "Procesando..." : props.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

