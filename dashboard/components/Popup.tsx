"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type PopupProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
};

export default function Popup({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-md",
}: PopupProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--admin-border)] px-4 py-3">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-medium text-[var(--admin-foreground)]">
              {title}
            </h2>

            {description && (
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            title="Close"
            className="
              flex h-6 w-6 shrink-0
              items-center justify-center
              rounded-md
              text-[var(--admin-muted)]
              transition-colors
              hover:bg-[var(--admin-surface-hover)]
              hover:text-[var(--admin-foreground)]
            "
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--admin-border)] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}