import { test } from "node:test";
import { deepEqual } from "node:assert";
import { shouldAutoSubmitEmptySection } from "../../src/lib/utils/responseNavigation.js";

test("shouldAutoSubmitEmptySection - returns false for preview mode", () => {
  const result = shouldAutoSubmitEmptySection({
    isMultiStep: true,
    hasCurrentSection: true,
    currentQuestionsLength: 0,
    activeSectionIndex: 1,
    visibleSectionsLength: 2,
    isPreviewMode: true,
  });

  deepEqual(result, false);
});

test("shouldAutoSubmitEmptySection - returns true for empty non-preview section", () => {
  const result = shouldAutoSubmitEmptySection({
    isMultiStep: true,
    hasCurrentSection: true,
    currentQuestionsLength: 0,
    activeSectionIndex: 1,
    visibleSectionsLength: 2,
    isPreviewMode: false,
  });

  deepEqual(result, true);
});

test("shouldAutoSubmitEmptySection - returns false when section has questions", () => {
  const result = shouldAutoSubmitEmptySection({
    isMultiStep: true,
    hasCurrentSection: true,
    currentQuestionsLength: 2,
    activeSectionIndex: 1,
    visibleSectionsLength: 3,
    isPreviewMode: false,
  });

  deepEqual(result, false);
});
