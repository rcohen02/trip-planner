"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getProfileRepo } from "@/lib/profile";
import { getTripRepo } from "@/lib/trips";
import { getDraftRepo, getGeocoder, getRates } from "@/lib/newtrip";
import { countryInfo, tripFromDraft } from "@/lib/newtrip/build";
import { usdRateFor } from "@/lib/newtrip/lookup";
import { applyTripStep, emptyDraft, nextTripStep, TRIP_STEPS, type Answers, type TripStepId } from "@/lib/newtrip/steps";

async function me() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/new");
  return viewer;
}

function answers(form: FormData): Answers {
  const out: Answers = {};
  for (const k of new Set(form.keys())) out[k] = form.getAll(k).filter((v): v is string => typeof v === "string").join("\n");
  return out;
}

/** Back to a step with a plain-words message (shown above the form). */
function retry(step: TripStepId, message: string, edit: boolean): never {
  redirect(`/new?step=${step}${edit ? "&mode=edit" : ""}&error=${encodeURIComponent(message)}`);
}

function onward(draft: Parameters<typeof nextTripStep>[0], edit: boolean): never {
  redirect(`/new?step=${edit ? "review" : nextTripStep(draft)}`);
}

/** Where to? Looks the place up on the map; the country sets the time zone and currency. */
export async function saveWhere(form: FormData) {
  const viewer = await me();
  const edit = form.get("mode") === "edit";
  const q = String(form.get("destination") ?? "").trim().slice(0, 200);
  if (!q) retry("where", "Type a city or region.", edit);
  const found = await getGeocoder().find(q);
  if (!found) retry("where", `I couldn't find “${q}” on the map. Try adding the country.`, edit);
  const repo = getDraftRepo();
  const draft = (await repo.get(viewer.email)) ?? emptyDraft();
  const moved = draft.destination && draft.destination.label !== found.label;
  const next = { ...draft, destination: found, homebase: moved ? null : draft.homebase };
  if (!next.confirmed.includes("where")) next.confirmed = [...next.confirmed, "where"];
  await repo.save(viewer.email, next);
  onward(next, edit && !moved);
}

/** Where are you staying? Looks the address up; if it can't be found, the pin goes on the city center. */
export async function saveStay(form: FormData) {
  const viewer = await me();
  const edit = form.get("mode") === "edit";
  const repo = getDraftRepo();
  const draft = (await repo.get(viewer.email)) ?? emptyDraft();
  if (!draft.destination) redirect("/new?step=where");
  const address = String(form.get("address") ?? "").trim().slice(0, 300);
  const label = String(form.get("label") ?? "").trim().slice(0, 80) || "Where we're staying";
  if (!address) retry("stay", "Add the address, or at least the neighborhood.", edit);
  const hit = await getGeocoder().find(address);
  const near = hit && hit.countryCode === draft.destination.countryCode;
  const homebase = near
    ? { label, address, lat: hit.lat, lng: hit.lng, found: true }
    : { label, address, lat: draft.destination.lat, lng: draft.destination.lng, found: false };
  const next = { ...draft, homebase, confirmed: [...new Set([...draft.confirmed, "stay" as const])] };
  await repo.save(viewer.email, next);
  onward(next, edit);
}

/** When, who, anything different, draft-or-build. */
export async function saveTripStep(form: FormData) {
  const viewer = await me();
  const step = String(form.get("step")) as TripStepId;
  if (!TRIP_STEPS.some((s) => s.id === step)) throw new Error("Unknown step");
  const edit = form.get("mode") === "edit";
  const repo = getDraftRepo();
  const draft = (await repo.get(viewer.email)) ?? emptyDraft();
  const profile = await getProfileRepo().get(viewer.email);
  let next;
  try {
    next = applyTripStep(draft, step, answers(form), profile?.groups.map((g) => g.id) ?? []);
  } catch (e) {
    retry(step, e instanceof Error ? e.message : "That didn't work. Try again.", edit);
  }
  await repo.save(viewer.email, next);
  onward(next, edit);
}

/** Yes on the read-back: creates the trip with you as owner and opens it. */
export async function createTrip() {
  const viewer = await me();
  const drafts = getDraftRepo();
  const draft = await drafts.get(viewer.email);
  const profile = await getProfileRepo().get(viewer.email);
  if (!draft || !profile) redirect("/new");
  if (nextTripStep(draft) !== "review") redirect(`/new?step=${nextTripStep(draft)}`);
  const trips = await getTripRepo();
  const currency = countryInfo(draft.destination!.countryCode)?.currency ?? "USD";
  const rate = await usdRateFor(currency, getRates());
  const trip = tripFromDraft(draft, profile, { email: viewer.email, name: viewer.name }, { ...rate, taken: await trips.slugs() });
  await trips.saveTrip(trip, viewer.email);
  await drafts.clear(viewer.email);
  revalidatePath("/");
  redirect(`/t/${trip.slug}`);
}

/** Start over: throws away the trip in progress. */
export async function discardDraft() {
  const viewer = await me();
  await getDraftRepo().clear(viewer.email);
  revalidatePath("/");
  redirect("/");
}
