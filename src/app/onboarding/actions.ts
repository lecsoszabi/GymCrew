"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Goal, Level, Sex } from "@/lib/types";

const SEXES: Sex[] = ["male", "female", "other"];
const GOALS: Goal[] = ["muscle", "strength", "fat_loss", "fitness", "health", "other"];
const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

/** Csak az engedett értékeket engedjük át — bármi más null lesz. */
function oneOf<T extends string>(allowed: T[], v: FormDataEntryValue | null): T | null {
  const s = v == null ? "" : String(v).trim();
  return (allowed as string[]).includes(s) ? (s as T) : null;
}

export type FormState = { error?: string };

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = str(formData.get("display_name"));
  if (!displayName || displayName.length < 2) {
    return { error: "Adj meg egy nevet (legalább 2 karakter)." };
  }

  const height = num(formData.get("height_cm"));
  const weight = num(formData.get("weight_kg"));

  if (height !== null && (height < 100 || height > 250)) {
    return { error: "A magasság 100 és 250 cm között lehet." };
  }
  if (weight !== null && (weight < 30 || weight > 300)) {
    return { error: "A testsúly 30 és 300 kg között lehet." };
  }

  const birth = str(formData.get("birth_date"));
  if (birth && (new Date(birth) >= new Date() || new Date(birth) < new Date("1920-01-01"))) {
    return { error: "A születési dátum nem tűnik valósnak." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: str(formData.get("avatar_url")),
      height_cm: height,
      weight_kg: weight,
      birth_date: birth,
      sex: oneOf(SEXES, formData.get("sex")),
      goal: oneOf(GOALS, formData.get("goal")),
      experience_level: oneOf(LEVELS, formData.get("experience_level")),
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: `Nem sikerült menteni: ${error.message}` };

  revalidatePath("/", "layout");
  redirect(formData.get("redirect_to") === "profile" ? "/app/profile" : "/app");
}
