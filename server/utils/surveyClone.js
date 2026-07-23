import { v4 as uuidv4 } from 'uuid';
import { normalizeQuestionValidation } from './questionValidation.js';

const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildDuplicateTitle = (title = '', maxLength = 200) => {
  const base = String(title || '').trim() || 'Untitled Survey';
  const prefix = 'Copy of ';
  const candidate = `${prefix}${base}`;
  if (candidate.length <= maxLength) return candidate;
  return `${prefix}${base.slice(0, Math.max(0, maxLength - prefix.length))}`;
};

const remapOptionLogicAction = (action, questionIdMap, sectionIdMap) => {
  if (!action || typeof action !== 'object') return action;

  const remapped = { ...action };

  if (typeof remapped.targetQuestionId === 'string') {
    remapped.targetQuestionId = questionIdMap.get(remapped.targetQuestionId) || remapped.targetQuestionId;
  }

  if (typeof remapped.targetSectionId === 'string') {
    remapped.targetSectionId = sectionIdMap.get(remapped.targetSectionId) || remapped.targetSectionId;
  }

  return remapped;
};

const remapOption = (option, questionIdMap, sectionIdMap) => {
  if (!option || typeof option !== 'object' || Array.isArray(option)) {
    return option;
  }

  const cloned = { ...option };
  if (cloned.logic?.action) {
    cloned.logic = {
      ...cloned.logic,
      action: remapOptionLogicAction(cloned.logic.action, questionIdMap, sectionIdMap),
    };
  }

  return cloned;
};

const remapQuestionReference = (questionId, questionIdMap) =>
  typeof questionId === 'string'
    ? questionIdMap.get(questionId) || questionId
    : questionId;

const remapNavigationCondition = (condition, questionIdMap) => {
  if (typeof condition === 'boolean') return condition;
  if (!condition || typeof condition !== 'object') return condition;

  const remapped = { ...condition };

  if (Array.isArray(remapped.all)) {
    remapped.all = remapped.all.map((item) =>
      remapNavigationCondition(item, questionIdMap)
    );
  }
  if (Array.isArray(remapped.any)) {
    remapped.any = remapped.any.map((item) =>
      remapNavigationCondition(item, questionIdMap)
    );
  }
  if (Array.isArray(remapped.conditions)) {
    remapped.conditions = remapped.conditions.map((item) =>
      remapNavigationCondition(item, questionIdMap)
    );
  }
  if (remapped.not && typeof remapped.not === 'object') {
    remapped.not = remapNavigationCondition(remapped.not, questionIdMap);
  }

  remapped.questionId = remapQuestionReference(remapped.questionId, questionIdMap);
  return remapped;
};

export const remapVersionPayload = (versionDoc = {}) => {
  const sourceSections = asArray(versionDoc.sections);
  const sourceQuestions = asArray(versionDoc.questions);
  const sourceVisibilityRules = asArray(versionDoc.visibilityRules);
  const sourceNavigationRules = asArray(versionDoc.navigationRules);

  const sectionIdMap = new Map();
  const questionIdMap = new Map();

  for (const section of sourceSections) {
    if (section?.id) {
      sectionIdMap.set(section.id, `section_${uuidv4()}`);
    }
  }

  for (const question of sourceQuestions) {
    if (question?.id) {
      questionIdMap.set(question.id, uuidv4());
    }
  }

  const questions = sourceQuestions.map((question) => {
    const newId = questionIdMap.get(question?.id) || uuidv4();
    return {
      ...question,
      id: newId,
      validation: normalizeQuestionValidation(question?.validation),
      sectionId:
        typeof question?.sectionId === 'string'
          ? sectionIdMap.get(question.sectionId) || question.sectionId
          : question?.sectionId,
      options: asArray(question?.options).map((option) =>
        remapOption(option, questionIdMap, sectionIdMap)
      ),
      logic: question?.logic?.visibleIf
        ? {
            ...question.logic,
            visibleIf: {
              ...question.logic.visibleIf,
              questionId:
                questionIdMap.get(question.logic.visibleIf.questionId) ||
                question.logic.visibleIf.questionId,
            },
          }
        : question?.logic,
    };
  });

  const sections = sourceSections.map((section) => ({
    ...section,
    id: sectionIdMap.get(section?.id) || `section_${uuidv4()}`,
    questionIds: asArray(section?.questionIds).map(
      (questionId) => questionIdMap.get(questionId) || questionId
    ),
  }));

  const visibilityRules = sourceVisibilityRules.map((rule) => ({
    ...rule,
    id: uuidv4(),
    targetId:
      rule?.targetType === 'question'
        ? questionIdMap.get(rule?.targetId) || rule?.targetId
        : rule?.targetType === 'section'
          ? sectionIdMap.get(rule?.targetId) || rule?.targetId
          : rule?.targetId,
    when: {
      ...rule?.when,
      questionId: questionIdMap.get(rule?.when?.questionId) || rule?.when?.questionId,
    },
  }));

  const navigationRules = sourceNavigationRules.map((rule) => ({
    ...rule,
    id: uuidv4(),
    fromSectionId:
      typeof rule?.fromSectionId === 'string'
        ? sectionIdMap.get(rule.fromSectionId) || rule.fromSectionId
        : rule?.fromSectionId ?? null,
    when: remapNavigationCondition(rule?.when, questionIdMap),
    action: {
      ...rule?.action,
      targetSectionId:
        typeof rule?.action?.targetSectionId === 'string'
          ? sectionIdMap.get(rule.action.targetSectionId) || rule.action.targetSectionId
          : rule?.action?.targetSectionId,
      targetQuestionId:
        typeof rule?.action?.targetQuestionId === 'string'
          ? questionIdMap.get(rule.action.targetQuestionId) || rule.action.targetQuestionId
          : rule?.action?.targetQuestionId,
    },
  }));

  return {
    questions,
    sections,
    visibilityRules,
    navigationRules,
    settings: versionDoc?.settings || {},
  };
};

export const cloneRecipientsPayload = (recipients = [], { surveyId, companyId, createdBy }) => {
  return asArray(recipients).map((recipient) => ({
    surveyId,
    companyId,
    createdBy,
    name: recipient?.name || '',
    phone: recipient?.phone,
    email: recipient?.email,
    isBlacklisted: Boolean(recipient?.isBlacklisted),
    status: 'pending',
    invitedAt: undefined,
    completedAt: undefined,
  }));
};
