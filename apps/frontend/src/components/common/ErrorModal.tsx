import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export function ErrorModal(props: {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return createPortal(
    <div className="modalOverlay" onClick={props.onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <h3>{props.title ?? "Error de validación"}</h3>
        <p>{props.message}</p>
        <div className="modalActions" style={{ marginTop: 24 }}>
          <Button onClick={props.onClose} className="btn--primary">
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
