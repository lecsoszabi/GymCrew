"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Szerver-action futtatása függő állapottal és hibaüzenettel. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else onDone?.();
    });
  }

  return { pending, error, setError, run };
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-no/10 px-3 py-2 text-sm text-no">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "yes" | "maybe" | "no" | "accent";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    muted: "bg-surface-2 text-muted",
    yes: "bg-yes/12 text-yes",
    maybe: "bg-maybe/12 text-maybe",
    no: "bg-no/12 text-no",
    accent: "bg-accent/12 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card px-5 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * Egyszerű, mobilbarát alsó lap (bottom sheet) / középre igazított dialógus.
 *
 * A <body> alá kerül (portál), nem oda, ahol a komponens van: így a görgetésre
 * éppen előtűnő, még áttetsző vagy elcsúsztatott szakasz sem teheti a lapot
 * áttetszővé, és nem is viheti el a helyéről.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // A portálhoz kell a document, ezért csak a hidratálás után rajzolunk.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Billentyűzettel is kezelhető: Escape bezárja, nyitáskor a fókusz a lapra
  // kerül (ha nincs benne autoFocus-os mező), záráskor visszatér oda, ahonnan
  // a lapot megnyitották. Az onClose-t refben tartjuk, mert a szülők minden
  // rendernél új függvényt adnak, és attól nem akarjuk újra fókuszálni a lapot.
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const visible = open && mounted;
  useEffect(() => {
    if (!visible) return;
    const elozo = document.activeElement as HTMLElement | null;
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (elozo?.isConnected) elozo.focus();
    };
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-fade-up relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {title && <h2 className="mb-4 pr-12 text-lg font-bold tracking-tight">{title}</h2>}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Bezárás"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Megerősítés az appon belül. A natív confirm() iPhone-on néhány ablak után
 * felkínálja a "további párbeszédek blokkolását", és onnantól csendben nemet
 * ad — a gomb egyszerűen nem csinált semmit.
 */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {body && <p className="-mt-2 text-sm leading-relaxed text-muted">{body}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
          Mégse
        </button>
        <button
          className={`btn ${danger ? "bg-no text-ink" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Egy pillanat…" : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
