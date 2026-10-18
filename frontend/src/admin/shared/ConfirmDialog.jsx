import { useState } from "react";
import toast from "react-hot-toast";
import Overlay from "./Overlay";
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  danger = false,
  children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      const message =
        failure.response?.data?.message || failure.message || "Action failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Overlay title={title} onClose={onClose} kind="confirm" busy={busy}>
      <p className="admin-muted">{description}</p>
      {children}
      {error && (
        <p role="alert" className="admin-error-text">
          {error}
        </p>
      )}
      <div className="admin-actions admin-confirm-actions">
        <button className="admin-button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className={`admin-button ${danger ? "admin-button-danger" : "admin-button-primary"}`}
          disabled={busy}
          onClick={confirm}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}
