import { X } from "lucide-react";

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = 560,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal"
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <div>
            <h3 className="admin-modal-title">{title}</h3>
            {description ? <p className="admin-modal-copy">{description}</p> : null}
          </div>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
