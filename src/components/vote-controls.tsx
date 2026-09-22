"use client";

import { useState } from "react";
import { castVote } from "@/app/app/actions";
import { ErrorNote, Sheet, useAction } from "@/components/ui";
import type { Vote } from "@/lib/types";

/** Igen / Talán / Nem. A NEM-hez kötelező indokot kér. */
export function VoteControls({
  sessionId,
  myVote,
  compact,
}: {
  sessionId: string;
  myVote: Vote | null;
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, error, run } = useAction();

  const options: { v: Vote; label: string; cls: string }[] = [
    { v: "yes", label: "Megyek", cls: "data-[on=true]:bg-yes data-[on=true]:text-ink" },
    { v: "maybe", label: "Talán", cls: "data-[on=true]:bg-maybe data-[on=true]:text-ink" },
    { v: "no", label: "Nem", cls: "data-[on=true]:bg-no data-[on=true]:text-ink" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            data-on={myVote === o.v}
            disabled={pending}
            onClick={() => (o.v === "no" ? setAsking(true) : run(() => castVote({ sessionId, vote: o.v })))}
            className={`btn btn-ghost ${compact ? "py-2 text-xs" : ""} ${o.cls}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Sheet open={asking} onClose={() => setAsking(false)} title="Miért nem jó ez az időpont?">
        <p className="-mt-2 mb-3 text-sm leading-relaxed text-muted">
          Az indok kötelező. Így a többiek tudják, mit kell máshogy időzíteni.
        </p>
        <textarea
          className="field min-h-24 resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Pl. akkor még melóban vagyok, 19 után viszont ráérek."
          aria-label="Miért nem jó ez az időpont?"
          maxLength={300}
          autoFocus
        />
        <ErrorNote>{error}</ErrorNote>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || reason.trim().length < 3}
          onClick={() =>
            run(() => castVote({ sessionId, vote: "no", reason }), () => {
              setAsking(false);
              setReason("");
            })
          }
        >
          {pending ? "Küldés…" : "Nem megyek — küldés"}
        </button>
      </Sheet>
    </>
  );
}
