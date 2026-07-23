/**
 * Survey versioning rules.
 *
 * Getting these wrong corrupts historical data irreversibly, so they live here
 * as pure functions with no database, and are unit-tested directly.
 *
 * The model: `Survey` is a pointer document; the questions live in
 * `SurveyVersion`, an immutable snapshot. Every `Response` records the version
 * it answered, so editing a survey never changes what a past respondent saw.
 *
 * Decided in docs/specs/2026-07-23-multitenant-foundation.md (Decision 5).
 */

export type SurveyStatusValue = "draft" | "published" | "closed";

/** The version fields an edit decision depends on. */
export interface SurveyVersionState {
  status: SurveyStatusValue;
  currentVersion: number;
  publishedVersion: number | null;
}

/**
 * What an edit should do to the version chain.
 *
 * - `mutate` — the current version is not published yet, so edit it in place.
 * - `fork`   — the current version is live, so copy it to a new version and
 *              edit that, leaving the published one untouched.
 */
export type EditPlan =
  | { action: "mutate"; version: number }
  | { action: "fork"; from: number; to: number };

export function planEdit(survey: SurveyVersionState): EditPlan {
  const isCurrentPublished = survey.publishedVersion === survey.currentVersion;

  if (isCurrentPublished) {
    return {
      action: "fork",
      from: survey.currentVersion,
      to: survey.currentVersion + 1,
    };
  }

  return { action: "mutate", version: survey.currentVersion };
}

/** Publishing freezes the current version and points `publishedVersion` at it. */
export function planPublish(survey: SurveyVersionState): SurveyVersionState {
  return {
    status: "published",
    currentVersion: survey.currentVersion,
    publishedVersion: survey.currentVersion,
  };
}

/** Closing stops new responses. The published version stays readable. */
export function planClose(survey: SurveyVersionState): SurveyVersionState {
  return { ...survey, status: "closed" };
}

/**
 * The version a public respondent must be served.
 *
 * Never the draft: a survey with unpublished edits still shows the last
 * published version until it is republished.
 */
export function versionForRespondent(
  survey: SurveyVersionState,
): number | null {
  if (survey.status !== "published") return null;

  return survey.publishedVersion;
}

/**
 * The version an answer must be read against.
 *
 * Analytics and exports use the version stamped on the response, never the
 * survey's current version — otherwise renamed or deleted questions would
 * silently change the meaning of old answers.
 */
export function versionForResponse(response: {
  surveyVersion: number;
}): number {
  return response.surveyVersion;
}

/** True when the survey has edits that respondents cannot see yet. */
export function hasUnpublishedChanges(survey: SurveyVersionState): boolean {
  return (
    survey.publishedVersion !== null &&
    survey.currentVersion !== survey.publishedVersion
  );
}
