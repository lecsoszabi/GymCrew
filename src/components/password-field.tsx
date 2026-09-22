"use client";

import { useState, type InputHTMLAttributes } from "react";

/**
 * Jelszómező megjelenítés/elrejtés gombbal. Telefonon vakon gépelni a jelszót
 * könnyű elrontani. A gomb 44 px-es kapcsoló (aria-pressed), a felirata
 * állandó, az állapotát a képernyőolvasó mondja be.
 */
export function PasswordField({
  className = "field",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label="Megjelenítés"
        aria-pressed={shown}
        aria-controls={props.id}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:text-fg"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
