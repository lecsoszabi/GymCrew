"use client";

import { useState, useTransition } from "react";

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

/** Egyszerű, mobilbarát alsó lap (bottom sheet) / középre igazított dialógus. */
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up relative w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {title && <h2 className="mb-4 pr-8 text-lg font-bold tracking-tight">{title}</h2>}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Bezárás"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
