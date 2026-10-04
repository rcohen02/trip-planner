"use client";
import { useOptimistic, useTransition } from "react";
import type { Todo } from "@/lib/content/types";
import { setTodo } from "@/app/t/[slug]/actions";

const GROUPS: { kind: Todo["kind"]; title: string }[] = [
  { kind: "book", title: "Book now" },
  { kind: "confirm", title: "Confirm hours" },
  { kind: "check", title: "Check" },
  { kind: "other", title: "Flights" },
];

export function Checklist({
  slug,
  todos,
  initial,
  booked,
  editable,
  actions,
}: {
  slug: string;
  todos: Todo[];
  initial: Record<string, boolean>;
  /** todoId → "Booked · Sat Oct 10, 7 pm": ticked by a saved booking, so the box is locked. */
  booked: Record<string, string>;
  editable: boolean;
  actions: Record<string, { label: string; href: string }>;
}) {
  const [done, toggle] = useOptimistic(initial, (s, [id, v]: [string, boolean]) => ({ ...s, [id]: v }));
  const [, start] = useTransition();
  const count = todos.filter((t) => done[t.id]).length;
  return (
    <div className="tp-col" style={{ gap: 20 }}>
      <div className="max-w-md">
        <p className="m-0 text-sm text-ink-2">
          <span className="tp-num">
            {count} of {todos.length}
          </span>{" "}
          done
        </p>
        <div className="tp-progress mt-2" aria-hidden>
          <span style={{ width: `${(count / Math.max(todos.length, 1)) * 100}%` }} />
        </div>
      </div>
      {GROUPS.map((g) => {
        const items = todos.filter((t) => t.kind === g.kind);
        if (!items.length) return null;
        return (
          <section key={g.kind} className="tp-card">
            <h2 className="t-heading m-0">{g.title}</h2>
            <div>
              {items.map((t) => {
                const action = actions[t.id];
                return (
                  <div key={t.id} className="tp-check">
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(done[t.id])}
                        disabled={!editable || Boolean(booked[t.id])}
                        title={booked[t.id] ? "Ticked by the booking. Remove the booking in Itinerary to untick." : undefined}
                        onChange={(e) => {
                          const v = e.target.checked;
                          start(async () => {
                            toggle([t.id, v]);
                            await setTodo(slug, t.id, v);
                          });
                        }}
                      />
                      <span>
                        <span className="tp-check__title">{t.text.replace(/\s*\(\+[\d\s]+\)/, "")}</span>
                        {booked[t.id] ? (
                          <span className="tp-check__detail">{booked[t.id]}</span>
                        ) : (
                          t.text.match(/\+[\d\s]+\d/) && <span className="tp-check__detail tp-data">{t.text.match(/\+[\d\s]+\d/)![0]}</span>
                        )}
                      </span>
                    </label>
                    {action && (
                      <a className="tp-btn tp-btn--secondary" href={action.href} target="_blank" rel="noreferrer">
                        {action.label}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
