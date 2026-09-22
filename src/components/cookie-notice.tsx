"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, LEGAL_VERSION } from "@/lib/legal";

/**
 * Süti-tájékoztató az első látogatáskor. A GymCrew csak feltétlenül szükséges
 * sütiket használ (bejelentkezés), ezekhez az EU-s szabályok szerint nem kell
 * hozzájárulás, csak tájékoztatás: ezért nincs "Elfogadom mind / Elutasítom"
 * választás, ami ugyanazt csinálná. Ha egyszer lesz nem szükséges süti (például
 * statisztika), az csak külön, kifejezett hozzájárulás után kerülhet be.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const latta = document.cookie.split("; ").includes(`${CONSENT_COOKIE}=${LEGAL_VERSION}`);
    if (!latta) setOpen(true);
  }, []);

  if (!open) return null;

  function rendben() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${LEGAL_VERSION}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    setOpen(false);
  }

  return (
    <div
      role="region"
      aria-label="Süti-tájékoztató"
      data-cookie-notice
      className="animate-fade-up fixed inset-x-3 z-[45] mx-auto max-w-md rounded-ui border border-line bg-surface p-4 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.85)]"
    >
      <p className="text-sm font-semibold">Sütik</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Csak a működéshez szükséges sütiket használjuk: ezek tartanak bejelentkezve. Reklám, követés
        és statisztika nincs. Ezekhez nem kell hozzájárulás, de tudnod kell róluk.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={rendben}>
          Rendben
        </button>
        <Link href="/adatvedelem#sutik" className="btn btn-ghost">
          Részletek
        </Link>
      </div>
    </div>
  );
}
