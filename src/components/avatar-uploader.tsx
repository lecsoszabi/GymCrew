"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";

/**
 * Profilkép feltöltő. A képet a böngészőben 400×400-ra vágjuk és JPEG-be
 * tömörítjük, így a Supabase ingyenes 1 GB-os tárhelye gyakorlatilag sosem fogy el.
 */
export function AvatarUploader({
  userId,
  name,
  value,
  onChange,
}: {
  userId: string;
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Csak képfájlt lehet feltölteni.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A kép túl nagy (max. 10 MB).");
      return;
    }

    setBusy(true);
    try {
      const blob = await squareResize(file, 400);
      const supabase = createClient();
      const path = `${userId}/avatar-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Nem sikerült a feltöltés: ${err.message}`
          : "Nem sikerült a feltöltés."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative rounded-full transition active:scale-95"
        aria-label="Profilkép kiválasztása"
      >
        <Avatar url={value} name={name || "?"} size={76} ring="#262a31" />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-sm font-semibold">{busy ? "Feltöltés…" : "Profilkép"}</p>
        <p className="text-xs text-muted">Koppints a körre. Négyzetesre vágjuk.</p>
        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 text-xs font-medium text-no"
          >
            Eltávolítás
          </button>
        )}
        {error && <p className="mt-1 text-xs text-no">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Középre igazított négyzetes kivágás + átméretezés, JPEG kimenettel. */
async function squareResize(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("A böngésző nem támogatja a képfeldolgozást");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Sikertelen képkonvertálás"))),
      "image/jpeg",
      0.85
    )
  );
}
