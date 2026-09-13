import { ProgressBar } from "@/components/ui";
import { formatDisplayDate, weekBounds } from "@/lib/journey";

type WeekRow = {
  type: string;
  label: string;
  done: number;
  target: number;
};

export function WeekPlanPanel({
  today,
  week,
}: {
  today: string;
  week: WeekRow[];
}) {
  const { start, end } = weekBounds(today);

  if (week.length === 0) return null;

  return (
    <section className="panel">
      <p className="eyebrow">Long-term tracking</p>
      <p className="tiny" style={{ marginBottom: 10 }}>
        {formatDisplayDate(start)} – {formatDisplayDate(end)} · targets, not
        judgments
      </p>
      {week.map((w) => (
        <div key={w.type} className="support-row">
          <div>
            <strong>{w.label}</strong>
            <p className="tiny">
              {w.done} / {w.target} this week
            </p>
          </div>
          <ProgressBar done={w.done} target={w.target} />
        </div>
      ))}
      {week.every((w) => w.done >= w.target) && (
        <p className="chip good" style={{ marginTop: 12 }}>
          Strong week — all supports hit. $20 treat gift unlocks.
        </p>
      )}
    </section>
  );
}
