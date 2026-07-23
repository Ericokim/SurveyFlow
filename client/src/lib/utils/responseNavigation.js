/**
 * Determine whether an empty terminal section should auto-submit.
 * Preview mode should never auto-submit on empty sections.
 */
export function shouldAutoSubmitEmptySection({
  isMultiStep,
  hasCurrentSection,
  currentQuestionsLength,
  activeSectionIndex,
  visibleSectionsLength,
  isPreviewMode,
}) {
  if (!isMultiStep || !hasCurrentSection || currentQuestionsLength > 0) {
    return false;
  }

  const hasNextSection = activeSectionIndex + 1 < visibleSectionsLength;
  if (hasNextSection) {
    return false;
  }

  return !isPreviewMode;
}
