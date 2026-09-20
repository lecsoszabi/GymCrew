"use client";

import { useState } from "react";
import { setDailyCheckin } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { Badge, ErrorNote, Sheet, useAction } from "@/components/ui";
import type { DailyCheckin } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

/** Ki mit mondott mára — és itt jelezhetsz te is elsőként. */
export function TodayBoard({
  me,
  members,
  checkins,
}: {
  me: string;
  members: Member[];
  checkins: DailyCheckin[];
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, error, run } = useAction();

  const mine = checkins.find((c) => c.user_id === me) ?? null;

  return (
    <div className="card divide-y divide-line">
      {members.map((m) => {
        const c = checkins.find((x) => x.user_id === m.id);
        return (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar url={m.avatar} name={m.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {m.name}
                {m.id === me && <span className="ml-1.5 text-xs font-normal text-muted">(te)</span>}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {!c
                  ? "Még nem jelzett"
                  : c.going
                    ? c.from_time
                      ? `Megy · ${c.from_time.slice(0, 5)}-tól`
                      : "Megy"
                    : c.reason}
              </p>
            </div>
            {c ? (
              <Badge tone={c.going ? "yes" : "no"}>{c.going ? "Megy" : "Kihagyja"}</Badge>
            ) : (
              <Badge>Néma</Badge>
            )}
          </div>
        );
      })}

      <div className="p-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            className={`btn ${mine?.going ? "btn-ghost" : "btn-primary"}`}
            disabled={pending}
            onClick={() => run(() => setDailyCheckin({ going: true }))}
          >
            {mine?.going ? "Megyek ✓" : "Ma megyek"}
          </button>
          <button
            className={`btn btn-ghost ${mine && !mine.going ? "text-no" : ""}`}
            disabled={pending}
            onClick={() => setDeclining(true)}
          >
            {mine && !mine.going ? "Kihagyom ✓" : "Ma nem"}
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted">
          Ha te jelzel elsőként, a többiek belépéskor megkapják a kérdést.
        </p>
      </div>

      <Sheet open={declining} onClose={() => setDeclining(false)} title="Miért nem jó ma?">
        <textarea
          className="field min-h-24 resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Egy rövid indok kötelező…"
          maxLength={300}
          autoFocus
        />
        <ErrorNote>{error}</ErrorNote>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || reason.trim().length < 3}
          onClick={() =>
            run(() => setDailyCheckin({ going: false, reason }), () => {
              setDeclining(false);
              setReason("");
            })
          }
        >
          {pending ? "Küldés…" : "Küldés"}
        </button>
      </Sheet>
    </div>
  );
}
