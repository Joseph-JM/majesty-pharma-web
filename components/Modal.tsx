"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ isOpen, title, description, eyebrow = "Workspace", onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-[3px] sm:p-6" onClick={onClose}>
      <div
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-scrollbar max-h-[92vh] w-full max-w-7xl overflow-y-auto overscroll-contain rounded-[32px] border border-white/70 bg-[#fcfbf8] shadow-[0_24px_90px_rgba(24,24,27,0.18)]"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,247,241,0.96))] px-6 py-5 backdrop-blur sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-gold">{eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950" id="modal-title">
                {title}
              </h3>
              {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-gray">{description}</p> : null}
            </div>
            <button
              aria-label="Close modal"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
              onClick={onClose}
              type="button"
            >
              X
            </button>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
      </div>
    </div>
  );
}
