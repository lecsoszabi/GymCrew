"use client";

import { useActionState, useState } from "react";
import { saveProfile, type FormState } from "./actions";
import { AvatarUploader } from "@/components/avatar-uploader";

const GOALS = [
  { v: "muscle", l: "Izomtömeg" },
  { v: "strength", l: "Erő" },
  { v: "fat_loss", l: "Fogyás" },
  { v: "fitness", l: "Erőnlét" },
  { v: "health", l: "Egészség" },
  { v: "other", l: "Egyéb" },
];

const LEVELS = [
  { v: "beginner", l: "Kezdő", d: "kevesebb mint 1 éve" },
  { v: "intermediate", l: "Haladó", d: "1–3 éve" },
  { v: "advanced", l: "Rutinos", d: "3+ éve" },
];

export default function OnboardingForm({
  userId,
  initialName,
  initialAvatar,
}: {
  userId: string;
  initialName: string;
  initialAvatar: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="avatar_url" value={avatar ?? ""} />

      <section className="card p-5">
        <AvatarUploader userId={userId} name={name} value={avatar} onChange={setAvatar} />
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="display_name">
            Név <span className="text-accent">*</span>
          </label>
          <input
            id="display_name"
            name="display_name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kovács Anna"
            required
            minLength={2}
            maxLength={40}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="height_cm">
              Magasság (cm)
            </label>
            <input
              id="height_cm"
              name="height_cm"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={100}
              max={250}
              className="field"
              placeholder="182"
            />
          </div>
          <div>
            <label className="label" htmlFor="weight_kg">
              Testsúly (kg)
            </label>
            <input
              id="weight_kg"
              name="weight_kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={30}
              max={300}
              className="field"
              placeholder="78"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="birth_date">
              Születési dátum
            </label>
            <input id="birth_date" name="birth_date" type="date" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="sex">
              Nem
            </label>
            <select id="sex" name="sex" className="field" defaultValue="">
              <option value="">Nem adom meg</option>
              <option value="male">Férfi</option>
              <option value="female">Nő</option>
              <option value="other">Egyéb</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="label">Mi a cél?</p>
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map((g) => (
            <label key={g.v} className="cursor-pointer">
              <input type="radio" name="goal" value={g.v} className="peer sr-only" />
              <span className="flex h-11 items-center justify-center rounded-xl border border-line bg-surface-2 px-2 text-center text-xs font-semibold text-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-ink">
                {g.l}
              </span>
            </label>
          ))}
        </div>

        <p className="label mt-5">Mióta edzel?</p>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <label key={l.v} className="cursor-pointer">
              <input type="radio" name="experience_level" value={l.v} className="peer sr-only" />
              <span className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 transition peer-checked:border-accent peer-checked:bg-accent/10">
                <span className="text-sm font-semibold">{l.l}</span>
                <span className="text-xs text-muted">{l.d}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {state.error && (
        <p role="alert" className="rounded-xl bg-no/10 px-4 py-3 text-sm text-no">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Mentés…" : "Mehet"}
      </button>

      <p className="pb-6 text-center text-xs text-muted">
        A csillagos mezőn kívül minden kihagyható, később is pótolható.
      </p>
    </form>
  );
}
