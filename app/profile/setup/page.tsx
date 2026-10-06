import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getProfileRepo } from "@/lib/profile";
import { formValues, nextStep, SETUP_STEPS, stepAnswered, type SetupStepId } from "@/lib/profile/setup";
import { emptyProfile } from "@/lib/profile/types";
import { saveStep } from "../actions";
import { ProfileSections, StepFields } from "../_parts";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ step?: string; mode?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/profile/setup");
  const params = await searchParams;
  const profile = (await getProfileRepo().get(viewer.email)) ?? emptyProfile();
  const edit = params.mode === "edit";
  const step: SetupStepId = SETUP_STEPS.some((s) => s.id === params.step) ? (params.step as SetupStepId) : nextStep(profile);
  const info = SETUP_STEPS.find((s) => s.id === step)!;
  const questions = SETUP_STEPS.filter((s) => s.id !== "review");
  const index = questions.findIndex((s) => s.id === step);
  const answered = questions.filter((s) => stepAnswered(profile, s.id)).length;
  const later = questions.slice(index + 1).find((s) => !stepAnswered(profile, s.id));

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-2 py-2">
        <Link href="/profile" className="tp-btn tp-btn--text" aria-label="Close and keep what's saved">
          ✕ Close
        </Link>
        <span className="tp-label">{edit ? "Edit profile" : step === "review" ? "Profile setup · read-back" : `Profile setup · ${index + 1} of ${questions.length}`}</span>
        <span className="w-[72px]" aria-hidden />
      </div>
      {!edit && (
        <div className="mx-4 mt-3 h-1 overflow-hidden rounded-sm bg-sunken" aria-hidden>
          <div className="h-full rounded-sm bg-accent" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} />
        </div>
      )}

      <form action={saveStep} className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-5">
        <input type="hidden" name="step" value={step} />
        {edit && <input type="hidden" name="mode" value="edit" />}
        <h1 className="m-0 text-[28px] font-bold leading-[34px] tracking-[-0.01em]">{info.question}</h1>
        <p className="t-caption m-0">{info.hint}</p>

        {step === "review" ? <ProfileSections p={profile} /> : <StepFields step={step} v={formValues(profile, step)} />}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button className="tp-btn tp-btn--primary min-h-[52px] text-base font-semibold">
            {step === "review" ? "Looks right, save" : edit ? "Save" : "Next"}
          </button>
          {!edit && step !== "review" && later && (
            <p className="t-caption m-0 text-center">Next up: {later.question}</p>
          )}
          {!edit && step !== "review" && !later && <p className="t-caption m-0 text-center">Then a read-back of your whole profile.</p>}
        </div>
      </form>
    </main>
  );
}
