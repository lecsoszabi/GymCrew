"use client";

import { useState } from "react";
import { updateProfile } from "@/app/app/actions";
import { AvatarUploader } from "@/components/avatar-uploader";
import { AvailabilityEditor } from "@/components/availability-editor";
import { ErrorNote, SectionTitle, Sheet, useAction } from "@/components/ui";
import type { Availability, Goal, Level, Sex } from "@/lib/types";

const GOALS: { v: Goal; l: string }[] = [
  { v: "muscle", l: "Izomtömeg" },
  { v: "strength", l: "Erő" },
  { v: "fat_loss", l: "Fogyás" },
  { v: "fitness", l: "Erőnlét" },
  { v: "health", l: "Egészség" },
  { v: "other", l: "Egyéb" },
];

const LEVELS: { v: Level; l: string }[] = [
  { v: "beginner", l: "Kezdő" },
  { v: "intermediate", l: "Haladó" },
  { v: "advanced", l: "Rutinos" },
];

const SEX_LABEL: Record<Sex, string> = { male: "Férfi", female: "Nő", other: "Egyéb" };

export default function ProfileEditor({
  userId,
  email,
  profile,
  groupName,
  isOwner,
  availability,
  totals,
}: {
  userId: string;
  email: string;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    heightCm: number | null;
    weightKg: number | null;
    birthDate: string | null;
    sex: Sex | null;
    goal: Goal | null;
    level: Level | null;
  };
  groupName: string | null;
  isOwner: boolean;
  availability: Availability[];
  totals: { total: number; last30: number; streak: number };
}) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? "");
  const [goal, setGoal] = useState<Goal | null>(profile.goal);
  const [level, setLevel] = useState<Level | null>(profile.level);
  const [showAvail, setShowAvail] = useState(false);
  const [saved, setSaved] = useState(false);

  const h = Number(height);
  const w = Number(weight);
  const bmi = h > 0 && w > 0 ? w / (h / 100) ** 2 : null;

  const age = profile.birthDate
    ? Math.floor((Date.now() - +new Date(profile.birthDate)) / (365.25 * 86_400_000))
    : null;

  const dirty =
    name !== profile.displayName ||
    avatar !== profile.avatarUrl ||
    (height === "" ? null : h) !== profile.heightCm ||
    (weight === "" ? null : w) !== profile.weightKg ||
    goal !== profile.goal ||
    level !== profile.level;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        <p className="mt-1 truncate text-sm text-muted">
          {email}
          {groupName && ` · ${groupName}`}
          {isOwner && " · főnök"}
        </p>
      </header>

      <section className="card p-5">
        <AvatarUploader userId={userId} name={name} value={avatar} onChange={setAvatar} />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <MiniStat label="30 nap" value={totals.last30} />
        <MiniStat label="Sorozat" value={`${totals.streak} hét`} />
        <MiniStat label="Összesen" value={totals.total} />
      </section>

      <section>
        <SectionTitle>Adataid</SectionTitle>
        <div className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="pname">
              Név
            </label>
            <input
              id="pname"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pheight">
                Magasság (cm)
              </label>
              <input
                id="pheight"
                className="field"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="182"
              />
            </div>
            <div>
              <label className="label" htmlFor="pweight">
                Testsúly (kg)
              </label>
              <input
                id="pweight"
                className="field"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="78"
              />
            </div>
          </div>

          {(bmi || age || profile.sex) && (
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              {bmi && (
                <span className="rounded-lg bg-surface-2 px-2.5 py-1.5">
                  BMI <span className="font-semibold text-fg">{bmi.toFixed(1)}</span>
                </span>
              )}
              {age !== null && (
                <span className="rounded-lg bg-surface-2 px-2.5 py-1.5">
                  <span className="font-semibold text-fg">{age}</span> éves
                </span>
              )}
              {profile.sex && (
                <span className="rounded-lg bg-surface-2 px-2.5 py-1.5">
                  {SEX_LABEL[profile.sex]}
                </span>
              )}
            </div>
          )}

          <div>
            <p className="label">Cél</p>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.v}
                  onClick={() => setGoal(goal === g.v ? null : g.v)}
                  className={`h-10 rounded-xl border text-xs font-semibold transition ${
                    goal === g.v
                      ? "border-accent bg-accent text-ink"
                      : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Szint</p>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.v}
                  onClick={() => setLevel(level === l.v ? null : l.v)}
                  className={`h-10 rounded-xl border text-xs font-semibold transition ${
                    level === l.v
                      ? "border-accent bg-accent text-ink"
                      : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {l.l}
                </button>
              ))}
            </div>
          </div>

          <ErrorNote>{error}</ErrorNote>
          {saved && !dirty && (
            <p className="rounded-lg bg-yes/10 px-3 py-2 text-sm text-yes">Mentve ✓</p>
          )}

          <button
            className="btn btn-primary w-full"
            disabled={pending || !dirty || name.trim().length < 2}
            onClick={() =>
              run(
                () =>
                  updateProfile({
                    display_name: name,
                    avatar_url: avatar,
                    height_cm: height === "" ? null : h,
                    weight_kg: weight === "" ? null : w,
                    goal,
                    experience_level: level,
                  }),
                () => setSaved(true)
              )
            }
          >
            {pending ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </section>

      <section>
        <SectionTitle>Mikor érsz rá</SectionTitle>
        <button
          onClick={() => setShowAvail(true)}
          className="card flex w-full items-center justify-between p-5 text-left transition hover:border-accent-dim"
        >
          <span>
            <span className="block text-sm font-semibold">Heti ráérés</span>
            <span className="mt-0.5 block text-xs text-muted">
              {availability.length > 0
                ? `${availability.length} idősáv megadva`
                : "Még nincs megadva — ebből jönnek a közös javaslatok"}
            </span>
          </span>
          <span className="text-accent">→</span>
        </button>
      </section>

      <section className="pb-4">
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost w-full text-no">
            Kijelentkezés
          </button>
        </form>
      </section>

      <Sheet open={showAvail} onClose={() => setShowAvail(false)} title="Mikor érek rá?">
        <AvailabilityEditor initial={availability} onSaved={() => setShowAvail(false)} />
      </Sheet>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
