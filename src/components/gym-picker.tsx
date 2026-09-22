"use client";

import { useMemo, useState } from "react";
import type { Gym } from "@/lib/types";

/** Kereshető lista a szegedi termekről. */
export function GymPicker({
  gyms,
  value,
  onChange,
  max = 8,
}: {
  gyms: Gym[];
  value: string | null;
  onChange: (id: string) => void;
  max?: number;
}) {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? gyms.filter(
          (g) =>
            g.name.toLowerCase().includes(needle) ||
            (g.address ?? "").toLowerCase().includes(needle)
        )
      : gyms;
    // A kiválasztott mindig látszódjon.
    const selected = gyms.find((g) => g.id === value);
    const head = selected && !filtered.includes(selected) ? [selected] : [];
    return [...head, ...filtered].slice(0, needle ? 30 : max);
  }, [gyms, q, value, max]);

  return (
    <div>
      <input
        className="field mb-2"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Keresés a ${gyms.length} szegedi terem között…`}
        aria-label="Terem keresése"
      />
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
        {list.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(g.id)}
            className={`flex w-full items-center gap-3 rounded-ui border px-3.5 py-3 text-left transition ${
              value === g.id
                ? "border-accent bg-accent/10"
                : "border-line bg-surface-2 hover:border-accent-dim"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{g.name}</span>
              {g.address && (
                <span className="block truncate text-xs text-muted">{g.address}, Szeged</span>
              )}
            </span>
            {value === g.id && <span className="text-accent">✓</span>}
          </button>
        ))}
        {list.length === 0 && (
          <p className="px-1 py-3 text-sm text-muted">Nincs találat erre: „{q}"</p>
        )}
      </div>
      {!q && gyms.length > max && (
        <p className="mt-2 text-xs text-muted">
          …és még {gyms.length - max} másik. Írj a keresőbe.
        </p>
      )}
    </div>
  );
}
