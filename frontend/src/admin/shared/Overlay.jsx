import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

let openOverlays = 0;
let previousOverflow = "";

export default function Overlay({
  title,
  children,
  onClose,
  kind = "drawer",
  busy = false,
}) {
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    const focusBefore = document.activeElement;
    node.showModal();
    if (openOverlays++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      node.close();
      if (--openOverlays === 0) document.body.style.overflow = previousOverflow;
      focusBefore?.focus?.();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      aria-label={title}
      className={`admin-console admin-overlay admin-${kind}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) closeRef.current();
      }}
    >
      <div className="admin-overlay-surface">
        <div className="admin-overlay-heading">
          <h2>{title}</h2>
          <button
            autoFocus
            className="admin-icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="admin-overlay-body">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
