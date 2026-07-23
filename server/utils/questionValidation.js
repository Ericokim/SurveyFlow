const PREDEFINED_PATTERN_ALIASES = {
  integer: 'numeric',
  number: 'numeric',
};

const ALLOWED_PREDEFINED_PATTERNS = new Set([
  'email',
  'phone',
  'url',
  'numeric',
  'alphanumeric',
]);

export const normalizePredefinedPattern = (value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const mapped = PREDEFINED_PATTERN_ALIASES[normalized] || normalized;
  return ALLOWED_PREDEFINED_PATTERNS.has(mapped) ? mapped : undefined;
};

export const normalizeQuestionValidation = (validation) => {
  if (!validation || typeof validation !== 'object' || Array.isArray(validation)) {
    return validation;
  }

  const normalized = { ...validation };
  const knownPatternAlias = normalizePredefinedPattern(normalized.pattern);
  if (!normalized.predefinedPattern && knownPatternAlias) {
    normalized.predefinedPattern = knownPatternAlias;
    delete normalized.pattern;
  }

  const predefinedPattern = normalizePredefinedPattern(normalized.predefinedPattern);

  if (predefinedPattern) {
    normalized.predefinedPattern = predefinedPattern;
  } else {
    delete normalized.predefinedPattern;
  }

  return normalized;
};

export const normalizeQuestionsValidation = (questions = []) => {
  if (!Array.isArray(questions)) return questions;

  return questions.map((question) => ({
    ...question,
    validation: normalizeQuestionValidation(question?.validation),
  }));
};
