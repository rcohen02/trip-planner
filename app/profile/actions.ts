"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getProfileRepo } from "@/lib/profile";
import { importNotes } from "@/lib/profile/importNotes";
import { applyStep, describeChanges, nextStep, SETUP_STEPS, type Answers, type SetupStepId } from "@/lib/profile/setup";
import { emptyProfile } from "@/lib/profile/types";

async function me() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/profile");
  return viewer.email;
}

const STEP_IDS = SETUP_STEPS.map((s) => s.id);

function answers(form: FormData): Answers {
  const out: Answers = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Saves one setup step. In setup mode it moves to the next unanswered question; in edit mode it returns to the profile. */
export async function saveStep(form: FormData) {
  const email = await me();
  const step = String(form.get("step")) as SetupStepId;
  if (!STEP_IDS.includes(step)) throw new Error("Unknown step");
  const mode = form.get("mode") === "edit" ? "edit" : "setup";
  const repo = getProfileRepo();
  const before = await repo.get(email);
  const after = applyStep(before ?? emptyProfile(), step, answers(form));
  const changed = describeChanges(before, after);
  const summary = changed === "No changes" ? `Confirmed: ${SETUP_STEPS.find((s) => s.id === step)!.question}` : changed;
  await repo.save(email, after, { reason: mode === "edit" ? "manual" : "setup", summary });
  revalidatePath("/profile");
  revalidatePath("/");
  if (mode === "edit" || step === "review") redirect("/profile");
  redirect(`/profile/setup?step=${nextStep(after)}`);
}

/** Imports pasted travel notes. Anything found is pre-filled; setup then asks only what's missing. */
export async function importFromNotes(form: FormData) {
  const email = await me();
  const text = String(form.get("notes") ?? "").slice(0, 50_000);
  const repo = getProfileRepo();
  const before = await repo.get(email);
  const imported = importNotes(text);
  await repo.save(email, { ...imported, confirmed: [] }, { reason: "import", summary: before ? "Replaced from travel notes" : "Imported from travel notes" });
  revalidatePath("/profile");
  redirect(`/profile/setup?step=${nextStep(imported)}`);
}

export async function undoChange(form: FormData) {
  const email = await me();
  await getProfileRepo().undo(email, String(form.get("id")));
  revalidatePath("/profile");
  revalidatePath("/");
}
