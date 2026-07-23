/* =========================================================
   Survey Structure Utilities
   - Constants for structure types
   - Local storage preference management
   - Shared between modals and editor components
========================================================= */

const SURVEY_STRUCTURE_KEY = "surveyStructureChoice";

export const STRUCTURE_TYPES = {
  QUESTION: "question",
  SECTION: "section",
};

/**
 * Saves the user's survey structure preference to localStorage
 * @param {string} structureType - The structure type (STRUCTURE_TYPES.QUESTION or STRUCTURE_TYPES.SECTION)
 * @returns {boolean} - Success status
 */
export function setSurveyStructurePreference(structureType) {
  if (!Object.values(STRUCTURE_TYPES).includes(structureType)) return false;
  try {
    localStorage.setItem(SURVEY_STRUCTURE_KEY, structureType);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the user's survey structure preference from localStorage
 * @returns {string|null} - The saved structure type or null if not found
 */
export function getSurveyStructurePreference() {
  try {
    return localStorage.getItem(SURVEY_STRUCTURE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears the user's survey structure preference from localStorage
 * @returns {boolean} - Success status
 */
export function clearSurveyStructurePreference() {
  try {
    localStorage.removeItem(SURVEY_STRUCTURE_KEY);
    return true;
  } catch {
    return false;
  }
}