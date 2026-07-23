import { cn } from "@/lib/utils";

/**
 * Organic header decoration for respondent-facing surveys.
 *
 * Two soft blurred blobs give the brand-coloured band depth, and three layered
 * waves dissolve its bottom edge into the page instead of ending on a hard
 * rectangle. The front wave is filled with the page background (slate-50, the
 * top stop of ResponseForm's gradient) so the seam disappears.
 *
 * Purely decorative: aria-hidden, pointer-events-none, and it renders behind the
 * header content, so it never intercepts a respondent's click.
 */
export function SurveyHeaderWave({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Soft blobs — the light catching the top of the band. */}
      <span className="absolute -right-16 -top-24 size-64 rounded-full bg-white/[0.12] blur-3xl" />
      <span className="absolute -bottom-16 left-[22%] size-48 rounded-full bg-white/[0.08] blur-3xl" />

      {/* Layered waves dissolving the bottom edge. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-14 w-full sm:h-20"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          fill="#ffffff"
          fillOpacity="0.10"
          d="M0,40 C200,90 420,10 700,44 C980,78 1200,120 1440,70 L1440,140 L0,140 Z"
        />
        <path
          fill="#ffffff"
          fillOpacity="0.14"
          d="M0,74 C180,34 400,104 700,80 C1000,56 1240,26 1440,74 L1440,140 L0,140 Z"
        />
        <path
          className="fill-slate-50"
          d="M0,104 C200,74 420,132 700,116 C980,100 1220,76 1440,110 L1440,140 L0,140 Z"
        />
      </svg>
    </span>
  );
}

export default SurveyHeaderWave;
