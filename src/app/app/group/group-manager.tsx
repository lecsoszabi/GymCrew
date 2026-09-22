"use client";

import { useState } from "react";
import {
  inviteByEmail,
  leaveGroup,
  removeMember,
  renameGroup,
  revokeInvite,
  setGroupGym,
  transferOwnership,
} from "./actions";
import { Avatar } from "@/components/avatar";
import { GymPicker } from "@/components/gym-picker";
import { Badge, ConfirmSheet, ErrorNote, SectionTitle, Sheet, useAction } from "@/components/ui";
import type { Gym } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

export default function GroupManager({
  group,
  me,
  isOwner,
  members,
  invites,
  gyms,
}: {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    gymId: string | null;
    gymName: string | null;
    ownerId: string;
  };
  me: string;
  isOwner: boolean;
  members: Member[];
  invites: { id: string; email: string }[];
  gyms: Gym[];
}) {
  const { pending, error, run } = useAction();
  const [email, setEmail] = useState("");
  const [switching, setSwitching] = useState(false);
  const [pickedGym, setPickedGym] = useState<string | null>(group.gymId);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  // Megerősítésre váró művelet (kitevés / főnökváltás).
  const [pendingAction, setPendingAction] = useState<
    { kind: "remove" | "owner"; member: Member } | null
  >(null);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* a vágólap nem mindig elérhető — a kód így is látszik */
    }
  }

  /** Telefonon a natív megosztóval megy (WhatsApp, Messenger, SMS…). */
  async function shareCode() {
    const szoveg =
      `Gyere a(z) "${group.name}" csapatba a GymCrew-n! ` +
      `Meghívókód: ${group.inviteCode}`;
    // A natív megosztó nincs meg minden böngészőben — ott vágólapra tesszük.
    const vanMegosztas = typeof navigator.share === "function";
    try {
      if (vanMegosztas) {
        await navigator.share({ title: "GymCrew meghívó", text: szoveg });
        return;
      }
      await navigator.clipboard.writeText(szoveg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* a megosztást a felhasználó megszakíthatja — nincs teendő */
    }
  }

  return (
    <div className="space-y-7">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{group.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {members.length} tag · {group.gymName ?? "nincs terem"}
            </p>
          </div>
          {isOwner && (
            <button className="btn btn-ghost shrink-0 px-3 text-xs" onClick={() => setRenaming(true)}>
              Átnevez
            </button>
          )}
        </div>
      </header>

      <ErrorNote>{error}</ErrorNote>

      {/* --- Meghívókód ------------------------------------------------- */}
      <section>
        <SectionTitle>Meghívókód</SectionTitle>
        <button
          onClick={copyCode}
          className="card flex w-full items-center justify-between gap-3 p-5 text-left transition hover:border-accent-dim"
        >
          <span>
            <span className="block font-display text-4xl font-bold tracking-[0.2em] tabular-nums text-accent">
              {group.inviteCode}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {copied ? "Vágólapra másolva ✓" : "Koppints a másoláshoz"}
            </span>
          </span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        </button>

        <button className="btn btn-primary mt-2 w-full" onClick={shareCode}>
          Kód küldése
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
          Ez a leggyorsabb út: küldd el a kódot üzenetben. Aki megkapja,
          a „Belépés kóddal" fülön beírja, és bent is van.
        </p>
      </section>

      {/* --- Terem ------------------------------------------------------ */}
      <section>
        <SectionTitle
          action={
            isOwner ? (
              <button className="tap text-xs font-semibold text-accent" onClick={() => setSwitching(true)}>
                Váltás
              </button>
            ) : null
          }
        >
          A csapat terme
        </SectionTitle>
        <div className="card p-5">
          {group.gymName ? (
            <p className="font-semibold">{group.gymName}</p>
          ) : (
            <p className="text-sm text-muted">Még nincs kiválasztva terem.</p>
          )}
          <p className="mt-1.5 text-xs text-muted">
            {isOwner
              ? "Főnökként te váltasz termet. A jövőbeli edzések is átkerülnek."
              : "A termet a csapat főnöke válthatja."}
          </p>
        </div>
      </section>

      {/* --- Tagok ------------------------------------------------------ */}
      <section>
        <SectionTitle>Tagok</SectionTitle>
        <div className="card divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <Avatar url={m.avatar} name={m.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {m.name}
                  {m.id === me && <span className="ml-1.5 text-xs font-normal text-muted">(te)</span>}
                </p>
              </div>
              {m.id === group.ownerId && <Badge tone="accent">Főnök</Badge>}
              {isOwner && m.id !== me && (
                <div className="flex gap-1.5">
                  <button
                    className="rounded-ui bg-surface-2 px-2.5 py-2 text-[11px] font-semibold text-muted"
                    disabled={pending}
                    onClick={() => setPendingAction({ kind: "owner", member: m })}
                  >
                    Főnök lesz
                  </button>
                  <button
                    className="rounded-ui bg-no/10 px-2.5 py-2 text-[11px] font-semibold text-no"
                    disabled={pending}
                    onClick={() => setPendingAction({ kind: "remove", member: m })}
                  >
                    Kitesz
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --- Meghívás --------------------------------------------------- */}
      {isOwner && (
        <section>
          <SectionTitle>Cím előjegyzése</SectionTitle>
          <div className="card space-y-3 p-5">
            <div className="flex gap-2">
              <input
                className="field"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="barat@pelda.hu"
                aria-label="Meghívandó e-mail cím"
              />
              <button
                className="btn btn-primary shrink-0 px-4"
                disabled={pending || !email.includes("@")}
                onClick={() => run(() => inviteByEmail(email), () => setEmail(""))}
              >
                Meghív
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              <strong className="text-fg">Innen nem megy ki levél.</strong> Ez csak
              előjegyzi a címet: aki ezzel az e-maillel regisztrál vagy belép, a
              kezdőképernyőn ott találja a meghívót, és egy kattintással beléphet,
              kód nélkül is.
            </p>

            {invites.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {invites.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-2 rounded-ui bg-surface-2 px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{i.email}</span>
                    <Badge>Függőben</Badge>
                    <button
                      className="text-xs font-semibold text-no"
                      disabled={pending}
                      onClick={() => run(() => revokeInvite(i.id))}
                    >
                      Visszavon
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- Kilépés ---------------------------------------------------- */}
      <section className="pb-4">
        <button className="btn btn-ghost w-full text-no" onClick={() => setLeaving(true)}>
          Kilépés a csapatból
        </button>
      </section>

      {/* --- Lapok ------------------------------------------------------ */}
      <Sheet open={switching} onClose={() => setSwitching(false)} title="Terem váltása">
        <GymPicker gyms={gyms} value={pickedGym} onChange={setPickedGym} max={6} />
        <ErrorNote>{error}</ErrorNote>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || !pickedGym || pickedGym === group.gymId}
          onClick={() => run(() => setGroupGym(pickedGym!), () => setSwitching(false))}
        >
          {pending ? "Váltás…" : "Ez legyen a terem"}
        </button>
      </Sheet>

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Csapat átnevezése">
        <input
          className="field"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <ErrorNote>{error}</ErrorNote>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || newName.trim().length < 2}
          onClick={() => run(() => renameGroup(newName), () => setRenaming(false))}
        >
          Mentés
        </button>
      </Sheet>

      <ConfirmSheet
        open={pendingAction !== null}
        title={
          pendingAction?.kind === "owner"
            ? `${pendingAction.member.name} legyen a főnök?`
            : `Kiteszed ${pendingAction?.member.name ?? ""} tagot?`
        }
        body={
          pendingAction?.kind === "owner"
            ? "Ő válthat termet és hívhat meg embereket. Te sima tag leszel."
            : "Kikerül a csapatból, de a meghívókóddal bármikor visszaléphet."
        }
        confirmLabel={pendingAction?.kind === "owner" ? "Legyen ő" : "Kiteszem"}
        danger={pendingAction?.kind === "remove"}
        pending={pending}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const a = pendingAction;
          if (!a) return;
          run(
            () => (a.kind === "owner" ? transferOwnership(a.member.id) : removeMember(a.member.id)),
            () => setPendingAction(null)
          );
        }}
      />

      <Sheet open={leaving} onClose={() => setLeaving(false)} title="Biztosan kilépsz?">
        <p className="-mt-2 text-sm leading-relaxed text-muted">
          Kilépés után nem látod a csapat edzéseit és statjait. Bármikor visszaléphetsz a
          meghívókóddal.
          {group.ownerId === me &&
            " Mivel te vagy a főnök, a legrégebbi tag veszi át a csapatot. Ha egyedül vagy, a csapat törlődik."}
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={() => setLeaving(false)}>
            Mégsem
          </button>
          <button
            className="btn btn-primary bg-no text-fg"
            disabled={pending}
            onClick={() => run(() => leaveGroup(), () => setLeaving(false))}
          >
            {pending ? "Kilépés…" : "Kilépek"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
