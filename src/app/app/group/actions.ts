"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCrew } from "@/lib/data";

export type Result = { ok: true } | { ok: false; error: string };
const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

function refresh() {
  revalidatePath("/app", "layout");
}

/** A Postgres kivételek szövegét emberi magyarra fordítjuk. */
function humanize(message: string): string {
  if (message.includes("Már tagja vagy")) return message;
  if (message.includes("Nincs ilyen meghívókód")) return "Nincs ilyen meghívókód.";
  if (message.includes("duplicate key") && message.includes("invite_code"))
    return "Kódütközés történt, próbáld újra.";
  if (message.includes("group_invites_group_id_invited_email_key"))
    return "Ezt az e-mailt már meghívtad.";
  return message;
}

export async function createGroup(name: string, gymId: string | null): Promise<Result> {
  if (name.trim().length < 2) return fail("A csoport neve legyen legalább 2 karakter.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", {
    p_name: name.trim(),
    p_gym_id: gymId,
  });

  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function joinGroup(code: string): Promise<Result> {
  const clean = code.trim().toUpperCase();
  if (clean.length !== 6) return fail("A meghívókód 6 karakter hosszú.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group_by_code", { p_code: clean });

  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function acceptInvite(inviteId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_invite: inviteId });

  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function declineInvite(inviteId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);

  if (error) return fail(error.message);
  refresh();
  return ok;
}

export async function leaveGroup(): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", {});
  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function inviteByEmail(email: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb hozz létre egy csoportot.");
  if (!crew.isOwner) return fail("Csak a csoport főnöke hívhat meg embereket.");

  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return fail("Ez nem érvényes e-mail cím.");
  if (clean === crew.email.toLowerCase()) return fail("Magadat nem kell meghívnod. 🙂");

  const supabase = await createClient();
  const { error } = await supabase.from("group_invites").upsert(
    {
      group_id: crew.group.id,
      invited_email: clean,
      invited_by: crew.userId,
      status: "pending",
    },
    { onConflict: "group_id,invited_email" }
  );

  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function revokeInvite(inviteId: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.isOwner) return fail("Csak a csoport főnöke vonhat vissza meghívót.");

  const supabase = await createClient();
  const { error } = await supabase.from("group_invites").delete().eq("id", inviteId);
  if (error) return fail(error.message);
  refresh();
  return ok;
}

export async function removeMember(userId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_user: userId });
  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

export async function transferOwnership(userId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", { p_user: userId });
  if (error) return fail(humanize(error.message));
  refresh();
  return ok;
}

/** A csoport kondijának váltása — csak a főnöknek. */
export async function setGroupGym(gymId: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb hozz létre egy csoportot.");
  if (!crew.isOwner) return fail("A termet csak a csoport főnöke válthatja.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({ gym_id: gymId })
    .eq("id", crew.group.id);

  if (error) return fail(error.message);

  // A még meg nem tartott edzések is az új terembe kerülnek.
  await supabase
    .from("sessions")
    .update({ gym_id: gymId })
    .eq("group_id", crew.group.id)
    .gte("starts_at", new Date().toISOString())
    .in("status", ["proposed", "confirmed"]);

  refresh();
  return ok;
}

export async function renameGroup(name: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Nincs csoportod.");
  if (!crew.isOwner) return fail("Csak a csoport főnöke nevezheti át a csapatot.");
  if (name.trim().length < 2) return fail("A név legyen legalább 2 karakter.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({ name: name.trim() })
    .eq("id", crew.group.id);

  if (error) return fail(error.message);
  refresh();
  return ok;
}
