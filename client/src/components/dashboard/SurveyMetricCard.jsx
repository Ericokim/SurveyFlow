import { cn } from "@/lib/utils";

/**
 * Survey metric card.
 *
 * An instrument-panel take on the KPI tile: a signal rail in the metric's accent,
 * a squircle glyph, tabular figures, and a footer visual.
 *
 * Every visual is driven by data already in cache. There is deliberately no
 * "vs last 30 days" delta: this page holds no per-response timestamps, and the
 * seeded surveys share a single createdAt, so both a trend and a weekly
 * sparkline would be decoration rather than information. Composition meters and
 * per-survey bars stay truthful whatever the data looks like.
 */

/**
 * Tailwind needs literal class names, so accents are mapped rather than
 * interpolated. Every value is a design token from theme.css — no hex.
 */
const ACCENTS = {
  blue: {
    rail: "from-chart-1/70 via-chart-1 to-chart-1/70",
    glyph: "bg-chart-1/10 text-chart-1 ring-chart-1/20",
    fill: "bg-chart-1",
    wash: "from-chart-1/[0.07]",
  },
  coral: {
    rail: "from-chart-2/70 via-chart-2 to-chart-2/70",
    glyph: "bg-chart-2/10 text-chart-2 ring-chart-2/20",
    fill: "bg-chart-2",
    wash: "from-chart-2/[0.07]",
  },
  amber: {
    rail: "from-chart-3/70 via-chart-3 to-chart-3/70",
    glyph: "bg-chart-3/10 text-chart-3 ring-chart-3/20",
    fill: "bg-chart-3",
    wash: "from-chart-3/[0.07]",
  },
  green: {
    rail: "from-chart-4/70 via-chart-4 to-chart-4/70",
    glyph: "bg-chart-4/10 text-chart-4 ring-chart-4/20",
    fill: "bg-chart-4",
    wash: "from-chart-4/[0.07]",
  },
  violet: {
    rail: "from-chart-5/70 via-chart-5 to-chart-5/70",
    glyph: "bg-chart-5/10 text-chart-5 ring-chart-5/20",
    fill: "bg-chart-5",
    wash: "from-chart-5/[0.07]",
  },
};

/** Proportion of a whole, as a single filled track. */
function Meter({ value, total, className, label }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex w-full items-center gap-2">
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={label}
      >
        <div
          style={{ width: `${pct}%` }}
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ease-out",
            className
          )}
        />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

/** Status mix across the whole portfolio, as one segmented track. */
function Segments({ parts, label }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div
      className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={label}
    >
      {parts.map((part) =>
        part.value > 0 ? (
          <span
            key={part.key}
            style={{ width: `${(part.value / (total || 1)) * 100}%` }}
            className={cn(
              "h-full motion-safe:transition-[width] motion-safe:duration-700",
              part.className
            )}
          />
        ) : null
      )}
    </div>
  );
}

/** One bar per recent survey, spanning the same band the meters occupy. */
function Bars({ series, className, label }) {
  const peak = Math.max(...series, 1);

  return (
    <div
      className="flex h-4 w-full items-end justify-between gap-0.75"
      role="img"
      // Screen readers get the actual figures; the bars alone convey nothing.
      aria-label={`${label}: ${series.join(", ")}`}
    >
      {series.map((value, i) => (
        <span
          key={i}
          // Zero collapses to a hairline baseline rather than a floored bar —
          // a visible bar for "no responses" reads as data that isn't there.
          style={{ height: value === 0 ? "2px" : `${Math.max((value / peak) * 100, 14)}%` }}
          className={cn(
            "min-w-0.75 max-w-2.25 flex-1 rounded-[2px] motion-safe:transition-opacity motion-safe:duration-300",
            value === 0 ? "opacity-25" : "opacity-70 group-hover:opacity-100",
            className
          )}
        />
      ))}
    </div>
  );
}

export function SurveyMetricCard({
  label,
  value,
  caption,
  icon: Icon,
  accent = "blue",
  viz,
}) {
  const a = ACCENTS[accent] ?? ACCENTS.blue;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "transition-all duration-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
      )}
    >
      {/* Signal rail — the card's one piece of colour at full strength. */}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-linear-to-r opacity-70",
          "transition-opacity duration-300 group-hover:opacity-100",
          a.rail
        )}
      />
      {/* Accent wash, strongest at the glyph and fading across the card. */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br to-transparent",
          a.wash
        )}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
              {value}
            </p>
          </div>

          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
              a.glyph
            )}
          >
            <Icon className="size-4.5" strokeWidth={2} />
          </span>
        </div>

        {/* Caption and visual sit in fixed bands so all four cards align across
            the row, whichever visual a metric warrants. */}
        <div className="mt-4 space-y-2">
          <p className="truncate text-xs text-muted-foreground">{caption}</p>

          <div className="flex h-4 items-center">
            {viz?.type === "meter" && (
              <Meter
                value={viz.value}
                total={viz.total}
                className={a.fill}
                label={viz.label}
              />
            )}
            {viz?.type === "segments" && (
              <Segments parts={viz.parts} label={viz.label} />
            )}
            {viz?.type === "bars" && (
              <Bars series={viz.series} className={a.fill} label={viz.label} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurveyMetricCard;
