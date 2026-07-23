import { describe, expect, it } from "vitest";

import {
  hasUnpublishedChanges,
  planClose,
  planEdit,
  planPublish,
  type SurveyVersionState,
  versionForRespondent,
  versionForResponse,
} from "@/features/surveys/versioning";

const draft: SurveyVersionState = {
  status: "draft",
  currentVersion: 1,
  publishedVersion: null,
};

const published: SurveyVersionState = {
  status: "published",
  currentVersion: 1,
  publishedVersion: 1,
};

/** Published v1, then edited — v2 exists but respondents still see v1. */
const editedAfterPublish: SurveyVersionState = {
  status: "published",
  currentVersion: 2,
  publishedVersion: 1,
};

describe("planEdit", () => {
  it("edits a draft in place", () => {
    expect(planEdit(draft)).toEqual({ action: "mutate", version: 1 });
  });

  it("forks a new version when the current one is published", () => {
    // The whole point: a live version must never be mutated under respondents.
    expect(planEdit(published)).toEqual({ action: "fork", from: 1, to: 2 });
  });

  it("keeps editing the same draft version after a fork", () => {
    expect(planEdit(editedAfterPublish)).toEqual({
      action: "mutate",
      version: 2,
    });
  });

  it("forks again once the newer version is itself published", () => {
    const republished: SurveyVersionState = {
      status: "published",
      currentVersion: 2,
      publishedVersion: 2,
    };

    expect(planEdit(republished)).toEqual({ action: "fork", from: 2, to: 3 });
  });
});

describe("planPublish", () => {
  it("freezes the current version", () => {
    expect(planPublish(draft)).toEqual({
      status: "published",
      currentVersion: 1,
      publishedVersion: 1,
    });
  });

  it("promotes a forked draft to live", () => {
    expect(planPublish(editedAfterPublish)).toEqual({
      status: "published",
      currentVersion: 2,
      publishedVersion: 2,
    });
  });
});

describe("planClose", () => {
  it("stops new responses without losing the published version", () => {
    expect(planClose(published)).toEqual({
      status: "closed",
      currentVersion: 1,
      publishedVersion: 1,
    });
  });
});

describe("versionForRespondent", () => {
  it("serves the published version", () => {
    expect(versionForRespondent(published)).toBe(1);
  });

  it("serves the published version, not unpublished edits", () => {
    expect(versionForRespondent(editedAfterPublish)).toBe(1);
  });

  it("serves nothing for a draft", () => {
    expect(versionForRespondent(draft)).toBeNull();
  });

  it("serves nothing once closed", () => {
    expect(versionForRespondent(planClose(published))).toBeNull();
  });
});

describe("versionForResponse", () => {
  it("reads an answer against the version it was given", () => {
    // Not the survey's current version — otherwise renamed or deleted
    // questions would change the meaning of old answers.
    expect(versionForResponse({ surveyVersion: 1 })).toBe(1);
  });
});

describe("hasUnpublishedChanges", () => {
  it("is false for a never-published draft", () => {
    expect(hasUnpublishedChanges(draft)).toBe(false);
  });

  it("is false when the live version is the current one", () => {
    expect(hasUnpublishedChanges(published)).toBe(false);
  });

  it("is true when a newer draft exists", () => {
    expect(hasUnpublishedChanges(editedAfterPublish)).toBe(true);
  });
});
