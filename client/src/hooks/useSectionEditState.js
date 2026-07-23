import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for managing section-scoped editing state
 * Each section maintains its own draft, snapshot, and dirty tracking
 */
export function useSectionEditState(section, questions, onSave) {
  // Draft state (working copy)
  const [draftTitle, setDraftTitle] = useState(section?.title || "");
  const [draftDescription, setDraftDescription] = useState(
    section?.description || ""
  );
  const [draftQuestions, setDraftQuestions] = useState(questions || []);

  // Snapshot (last saved version)
  const snapshotRef = useRef({
    title: section?.title || "",
    description: section?.description || "",
    questions: questions || [],
  });

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState([]);

  // Sync draft with props when section/questions change from outside
  useEffect(() => {
    setDraftTitle(section?.title || "");
    setDraftDescription(section?.description || "");
    setDraftQuestions(questions || []);

    // Update snapshot on external changes
    snapshotRef.current = {
      title: section?.title || "",
      description: section?.description || "",
      questions: questions || [],
    };

    setIsDirty(false);
  }, [section?.title, section?.description, section?._id, questions]);

  // Update draft title
  const updateTitle = useCallback((title) => {
    setDraftTitle(title);
    setIsDirty(true);
  }, []);

  // Update draft description
  const updateDescription = useCallback((description) => {
    setDraftDescription(description);
    setIsDirty(true);
  }, []);

  // Update a question in the draft
  const updateQuestion = useCallback((questionId, updates) => {
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    );
    setIsDirty(true);
  }, []);

  // Add a question to the draft
  const addQuestion = useCallback((newQuestion) => {
    setDraftQuestions((prev) => [...prev, newQuestion]);
    setIsDirty(true);
  }, []);

  // Delete a question from the draft
  const deleteQuestion = useCallback((questionId) => {
    setDraftQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setIsDirty(true);
  }, []);

  // Reorder questions in the draft
  const reorderQuestions = useCallback((newQuestionIds) => {
    setDraftQuestions((prev) => {
      const questionMap = new Map(prev.map((q) => [q.id, q]));
      return newQuestionIds.map((id) => questionMap.get(id)).filter(Boolean);
    });
    setIsDirty(true);
  }, []);

  // Validate section before save
  const validate = useCallback(() => {
    const errors = [];

    // Check if any questions are missing titles
    const missingTitles = draftQuestions.filter(
      (q) => !q.title || q.title.trim() === ""
    );
    if (missingTitles.length > 0) {
      errors.push({
        type: "missing_title",
        message: `${missingTitles.length} question${missingTitles.length > 1 ? "s" : ""} need titles`,
        questionIds: missingTitles.map((q) => q.id),
      });
    }

    // Check if choice questions have options
    const missingOptions = draftQuestions.filter(
      (q) =>
        (q.type === "single_choice" || q.type === "multiple_choice") &&
        (!q.options || q.options.length === 0)
    );
    if (missingOptions.length > 0) {
      errors.push({
        type: "missing_options",
        message: `${missingOptions.length} choice question${missingOptions.length > 1 ? "s" : ""} need options`,
        questionIds: missingOptions.map((q) => q.id),
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [draftQuestions]);

  // Save section
  const save = useCallback(async () => {
    if (!validate()) {
      return false;
    }

    try {
      // Call the provided onSave with draft data
      await onSave?.({
        sectionId: section?.id,
        title: draftTitle,
        description: draftDescription,
        questions: draftQuestions,
      });

      // Update snapshot on successful save
      snapshotRef.current = {
        title: draftTitle,
        description: draftDescription,
        questions: [...draftQuestions],
      };

      setIsDirty(false);
      setValidationErrors([]);
      return true;
    } catch (error) {
      console.error("Failed to save section:", error);
      return false;
    }
  }, [
    validate,
    onSave,
    section?.id,
    draftTitle,
    draftDescription,
    draftQuestions,
  ]);

  // Cancel changes (revert to snapshot)
  const cancel = useCallback(() => {
    setDraftTitle(snapshotRef.current.title);
    setDraftDescription(snapshotRef.current.description);
    setDraftQuestions([...snapshotRef.current.questions]);
    setIsDirty(false);
    setValidationErrors([]);
  }, []);

  return {
    // Draft state
    draftTitle,
    draftDescription,
    draftQuestions,

    // Actions
    updateTitle,
    updateDescription,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    save,
    cancel,

    // Status
    isDirty,
    validationErrors,
    canSave: isDirty && validationErrors.length === 0,
  };
}
