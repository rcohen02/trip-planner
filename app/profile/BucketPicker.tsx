"use client";
import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addWriteIn, initialBuckets, moveChip, type Buckets } from "@/lib/profile/buckets";

/** Drop where the finger or pointer is; fall back to overlap (keyboard dragging has no pointer). */
const dropUnderPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** A second question for one button (e.g. Hikes → Easy / Intermediate / Challenging), asked when it lands in a bucket. */
export interface FollowUp {
  item: string;
  name: string;
  question: string;
  options: readonly { value: string; label: string }[];
  value: string;
}

export interface BucketDef {
  key: string;
  label: string;
  hint?: string;
}

/**
 * Buttons to sort into buckets by dragging, or by tapping a button and then a bucket (drag always has a tap
 * alternative). Each bucket posts as a hidden input named by its key, one item per line.
 */
export function BucketPicker({
  id,
  buckets,
  options,
  picked,
  poolLabel,
  writeInLabel,
  followUp,
}: {
  id: string;
  buckets: BucketDef[];
  options: readonly string[];
  picked: Record<string, string[]>;
  poolLabel: string;
  writeInLabel: string;
  followUp?: FollowUp;
}) {
  const keys = buckets.map((b) => b.key);
  const [state, setState] = useState<Buckets>(() => initialBuckets(keys, options, picked));
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [target, setTarget] = useState(keys[0]);
  const [level, setLevel] = useState(followUp?.value ?? "");
  const [askLevel, setAskLevel] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const move = (item: string, to: string) => {
    setState((s) => moveChip(s, item, to, options));
    setSelected(null);
    if (followUp && item === followUp.item && to !== "pool" && !level) setAskLevel(true);
  };
  const levelLabel = followUp?.options.find((o) => o.value === level)?.label;
  const show = (item: string) => (followUp && item === followUp.item && levelLabel ? `${item} · ${levelLabel}` : item);
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over) move(String(e.active.id), String(e.over.id));
  };
  const where = (item: string) => Object.keys(state).find((k) => state[k].includes(item));
  const label = (key: string) => (key === "pool" ? "Not sorted" : buckets.find((b) => b.key === key)?.label ?? key);

  function addOwn() {
    if (!text.trim()) return;
    setState((s) => addWriteIn(s, text, target));
    setText("");
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={dropUnderPointer} onDragEnd={onDragEnd}>
      {keys.map((k) => (
        <input key={k} type="hidden" name={k} value={state[k].join("\n")} />
      ))}
      {followUp && <input type="hidden" name={followUp.name} value={level} />}

      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {buckets.map((b) => (
          <Bucket key={b.key} def={b} items={state[b.key]} show={show} selected={selected} onPick={setSelected} onPlace={() => selected && move(selected, b.key)} />
        ))}
      </div>

      <Pool label={poolLabel} items={state.pool} show={(x) => x} selected={selected} onPick={setSelected} onPlace={() => selected && move(selected, "pool")} />

      <div className="tp-card tp-card--compact gap-2">
        <label className="tp-field" htmlFor={`${id}-own`}>
          <span>{writeInLabel}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-own`}
            className="tp-input min-w-0 flex-[1_1_180px]"
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOwn();
              }
            }}
            placeholder="Type your own"
          />
          <select className="tp-input flex-[0_1_auto]" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Add it to">
            {buckets.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
          <button type="button" className="tp-btn tp-btn--secondary" onClick={addOwn}>
            Add
          </button>
        </div>
        <span className="tp-help">Add as many as you like.</span>
      </div>

      {selected && <div className="tp-scrim" onClick={() => setSelected(null)} aria-hidden />}
      {selected && (
        <div className="tp-sheet" role="dialog" aria-label={`Move ${selected}`}>
          <p className="t-subheading m-0">
            “{selected}” <span className="t-caption">· now in {label(where(selected) ?? "pool")}</span>
          </p>
          {followUp && selected === followUp.item && (
            <LevelRow f={followUp} level={level} onPick={setLevel} />
          )}
          <div className="mt-3 grid gap-2">
            {buckets.map((b) => (
              <button key={b.key} type="button" className="tp-btn tp-btn--primary" disabled={where(selected) === b.key} onClick={() => move(selected, b.key)}>
                {b.label}
              </button>
            ))}
            {where(selected) !== "pool" && (
              <button type="button" className="tp-btn tp-btn--secondary" onClick={() => move(selected, "pool")}>
                Take it out
              </button>
            )}
            <button type="button" className="tp-btn tp-btn--text" onClick={() => setSelected(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {askLevel && followUp && (
        <>
          <div className="tp-scrim" onClick={() => setAskLevel(false)} aria-hidden />
          <div className="tp-sheet" role="dialog" aria-label={followUp.question}>
            <LevelRow
              f={followUp}
              level={level}
              onPick={(v) => {
                setLevel(v);
                setAskLevel(false);
              }}
            />
            <button type="button" className="tp-btn tp-btn--text mt-2 w-full" onClick={() => setAskLevel(false)}>
              Skip
            </button>
          </div>
        </>
      )}
    </DndContext>
  );
}

function LevelRow({ f, level, onPick }: { f: FollowUp; level: string; onPick: (v: string) => void }) {
  return (
    <fieldset className="m-0 mt-3 border-0 p-0">
      <legend className="t-subheading mb-2 p-0">{f.question}</legend>
      <div className="grid grid-cols-3 gap-2">
        {f.options.map((o) => (
          <button key={o.value} type="button" aria-pressed={level === o.value} className="tp-chip justify-center px-2" onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Bucket({
  def,
  items,
  show,
  selected,
  onPick,
  onPlace,
}: {
  def: BucketDef;
  items: string[];
  show: (x: string) => string;
  selected: string | null;
  onPick: (x: string) => void;
  onPlace: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: def.key });
  return (
    <section
      ref={setNodeRef}
      aria-label={def.label}
      className={`flex min-h-[112px] flex-col gap-2 rounded-[var(--radius-card)] p-3 ${
        isOver ? "border-2 border-dashed border-[var(--drop-line)] bg-[var(--drop-bg)]" : "border-[1.5px] border-dashed border-control bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="t-subheading m-0">{def.label}</h2>
        <span className="t-caption tp-num">{items.length}</span>
      </div>
      {def.hint && <p className="t-caption m-0">{def.hint}</p>}
      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <Chip key={x} item={x} text={show(x)} on selected={selected === x} onPick={onPick} />
        ))}
        {!items.length && <span className="t-caption py-2 text-ink-3">Drag here, or tap a button below</span>}
      </div>
      {selected && !items.includes(selected) && (
        <button type="button" className="tp-btn tp-btn--text self-start" onClick={onPlace}>
          Put “{selected}” here
        </button>
      )}
    </section>
  );
}

function Pool({ label, items, show, selected, onPick, onPlace }: { label: string; items: string[]; show: (x: string) => string; selected: string | null; onPick: (x: string) => void; onPlace: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  return (
    <section ref={setNodeRef} aria-label={label} className={`flex flex-col gap-2 rounded-[var(--radius-card)] p-1 ${isOver ? "bg-sunken" : ""}`}>
      <span className="tp-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <Chip key={x} item={x} text={show(x)} selected={selected === x} onPick={onPick} />
        ))}
        {!items.length && <span className="t-caption">All sorted.</span>}
      </div>
      {selected && !items.includes(selected) && (
        <button type="button" className="tp-btn tp-btn--text self-start" onClick={onPlace}>
          Take “{selected}” out
        </button>
      )}
    </section>
  );
}

function Chip({ item, text, on = false, selected, onPick }: { item: string; text: string; on?: boolean; selected: boolean; onPick: (x: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      aria-pressed={on}
      aria-roledescription="draggable button"
      onClick={() => onPick(item)}
      className={`tp-chip touch-none select-none ${selected ? "outline outline-2 outline-offset-2 outline-[var(--focus-ring)]" : ""} ${
        isDragging ? "shadow-[var(--shadow-drag)]" : ""
      }`}
    >
      {text}
    </button>
  );
}
