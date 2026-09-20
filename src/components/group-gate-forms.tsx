"use client";

import { useState } from "react";
import { acceptInvite, createGroup, declineInvite, joinGroup } from "@/app/app/group/actions";
import { GymPicker } from "@/components/gym-picker";
import { ErrorNote, useAction } from "@/components/ui";
import type { Gym } from "@/lib/types";

export default function GroupGateForms({
  gyms,
  pendingInvites,
}: {
  gyms: Gym[];
  pendingInvites: { id: string; groupName: string }[];
}) {
  const [tab, setTab] = useState<"create" | "join">(pendingInvites.length ? "join" : "create");
  const [name, setName] = useState("");
  const [gymId, setGymId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const { pending, error, run } = useAction();

  return (
    <div className="space-y-5">
      {pendingInvites.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-bold">Meghívóid</h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{inv.groupName}</p>
                <button
                  className="btn btn-ghost px-3 py-2 text-xs"
                  disabled={pending}
                  onClick={() => run(() => declineInvite(inv.id))}
                >
                  Elutasít
                </button>
                <button
                  className="btn btn-primary px-3 py-2 text-xs"
                  disabled={pending}
                  onClick={() => run(() => acceptInvite(inv.id))}
                >
                  Belépek
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === t ? "bg-accent text-ink" : "text-muted"
            }`}
          >
            {t === "create" ? "Új csapat" : "Belépés kóddal"}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="group-name">
              Csapat neve
            </label>
            <input
              id="group-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vasgyúrók"
              maxLength={40}
            />
          </div>

          <div>
            <p className="label">Hova jártok? (később bármikor váltható)</p>
            <GymPicker gyms={gyms} value={gymId} onChange={setGymId} />
          </div>

          <ErrorNote>{error}</ErrorNote>

          <button
            className="btn btn-primary w-full"
            disabled={pending || name.trim().length < 2}
            onClick={() => run(() => createGroup(name, gymId))}
          >
            {pending ? "Létrehozás…" : "Csapat létrehozása"}
          </button>
        </section>
      ) : (
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="join-code">
              Meghívókód
            </label>
            <input
              id="join-code"
              className="field text-center font-mono text-2xl tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
            />
            <p className="mt-2 text-xs text-muted">
              A csapat főnökétől kapod — a Csapat fülön látja.
            </p>
          </div>

          <ErrorNote>{error}</ErrorNote>

          <button
            className="btn btn-primary w-full"
            disabled={pending || code.length !== 6}
            onClick={() => run(() => joinGroup(code))}
          >
            {pending ? "Belépés…" : "Belépek a csapatba"}
          </button>
        </section>
      )}
    </div>
  );
}
