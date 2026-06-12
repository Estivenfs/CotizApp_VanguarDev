import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./Button";
import "../../styles/action-menu.css";

export type ActionMenuItem = {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  title?: string;
};

export function ActionMenu({ items, title = "Opciones" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = useMemo(() => items.filter((item) => !item.disabled), [items]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="actionMenu">
      <Button
        type="button"
        className="btn--icon btn--ghost actionMenu__trigger"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        ⋮
      </Button>

      {open ? (
        <div className="actionMenu__panel" role="menu">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`actionMenu__item ${item.tone === "danger" ? "actionMenu__item--danger" : ""}`.trim()}
              onClick={async () => {
                await item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
