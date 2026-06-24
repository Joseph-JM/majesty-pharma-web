"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  allowFullscreen?: boolean;
  size?: "sm" | "md" | "default";
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ isOpen, title, description, eyebrow = "Workspace", allowFullscreen = false, size = "default", onClose, children }: ModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleClose = useCallback(() => {
    setIsFullscreen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 backdrop-blur-[3px] ${isFullscreen ? "p-0" : "p-3 sm:p-4"}`}
      onClick={handleClose}
    >
      <div
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal-scrollbar overflow-y-auto overscroll-contain bg-[#fcfbf8] shadow-[0_24px_90px_rgba(24,24,27,0.18)] ${isFullscreen
          ? "h-screen max-h-screen w-full max-w-none rounded-none border-0"
          : `max-h-[90vh] w-full rounded-[28px] border border-white/70 ${size === "sm" ? "max-w-md" : size === "md" ? "max-w-3xl" : "max-w-7xl"}`}`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,247,241,0.96))] px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-gold">{eyebrow}</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl" id="modal-title">
                {title}
              </h3>
              {description ? <p className="mt-1.5 max-w-2xl text-sm leading-5 text-brand-gray">{description}</p> : null}
            </div>
            <div className="flex items-center gap-3">
              {allowFullscreen ? (
                <button
                  aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800"
                  onClick={() => setIsFullscreen((current) => !current)}
                  type="button"
                >
                  {isFullscreen ? "Windowed" : "Fullscreen"}
                </button>
              ) : null}
              <button
                aria-label="Close modal"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                onClick={handleClose}
                type="button"
              >
                X
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
