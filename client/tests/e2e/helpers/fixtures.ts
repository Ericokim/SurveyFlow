export type SurveyQuestion = {
  id: string;
  type: string;
  title: string;
  required?: boolean;
  options?: string[];
  allowOther?: boolean;
  sectionId?: string;
  order?: number;
};

export type SurveySection = {
  id: string;
  title: string;
  order: number;
  questionIds: string[];
};

export type SurveyShape = {
  _id: string;
  publicId: string;
  title: string;
  description?: string;
  status?: string;
  type?: string;
  questions: SurveyQuestion[];
  sections?: SurveySection[];
  visibilityRules?: any[];
  navigationRules?: any[];
  settings?: {
    presentationMode?: 'single_page' | 'multi_step';
    isSectional?: boolean;
    autoAdvanceThreshold?: number | null;
  };
  themeColor?: string;
  logo?: string;
  thankYouMessage?: string;
  showProgress?: boolean;
  oneResponsePerRecipient?: boolean;
  isWhitelistEnabled?: boolean;
};

export const baseQuestionSurvey = (): SurveyShape => ({
  _id: 'survey-q-1',
  publicId: 'pub-q-1',
  title: 'Editor Survey',
  description: 'Editor flow validation',
  status: 'draft',
  type: 'open_ended',
  questions: [
    { id: 'q1', type: 'short_text', title: 'Original question title', order: 1 },
    {
      id: 'q2',
      type: 'single_choice',
      title: 'Pick one',
      options: ['Option 1', 'Option 2'],
      allowOther: true,
      order: 2,
    },
  ],
  sections: [],
  visibilityRules: [],
  navigationRules: [],
  settings: {
    presentationMode: 'single_page',
    isSectional: false,
    autoAdvanceThreshold: null,
  },
  themeColor: '#3b82f6',
  thankYouMessage: 'Thank you for completing this survey!',
  showProgress: true,
  oneResponsePerRecipient: true,
  isWhitelistEnabled: false,
});

export const baseSectionSurvey = (): SurveyShape => ({
  _id: 'survey-s-1',
  publicId: 'pub-s-1',
  title: 'Section Survey',
  description: 'Section flow validation',
  status: 'draft',
  type: 'open_ended',
  questions: [
    { id: 'sq1', type: 'short_text', title: 'Section 1 question', order: 1, sectionId: 's1', required: true },
    {
      id: 'sq2',
      type: 'single_choice',
      title: 'Section 2 question',
      options: ['Yes', 'No'],
      order: 2,
      sectionId: 's2',
    },
  ],
  sections: [
    { id: 's1', title: 'Section 1', order: 0, questionIds: ['sq1'] },
    { id: 's2', title: 'Section 2', order: 1, questionIds: ['sq2'] },
  ],
  visibilityRules: [],
  navigationRules: [],
  settings: {
    presentationMode: 'multi_step',
    isSectional: true,
    autoAdvanceThreshold: null,
  },
  themeColor: '#3b82f6',
  thankYouMessage: 'Thank you for completing this survey!',
  showProgress: true,
  oneResponsePerRecipient: true,
  isWhitelistEnabled: false,
});

export const emptySectionTailSurvey = (): SurveyShape => {
  const survey = baseSectionSurvey();
  survey.questions = [
    { id: 'sq1', type: 'short_text', title: 'Only first section question', order: 1, sectionId: 's1' },
  ];
  survey.sections = [
    { id: 's1', title: 'Section 1', order: 0, questionIds: ['sq1'] },
    { id: 's2', title: 'Section 2', order: 1, questionIds: [] },
  ];
  return survey;
};

export const surveyWithBranching = (): SurveyShape => {
  const survey = baseSectionSurvey();
  survey.navigationRules = [
    {
      id: 'nav-jump',
      fromSectionId: 's1',
      priority: 10,
      when: { questionId: 'sq1', operator: 'equals', value: 'go' },
      action: { type: 'jump', targetSectionId: 's2' },
    },
    {
      id: 'nav-end',
      fromSectionId: 's1',
      priority: 20,
      when: { questionId: 'sq1', operator: 'equals', value: 'end' },
      action: { type: 'terminate' },
    },
  ];
  survey.visibilityRules = [
    {
      id: 'vis-s2',
      targetType: 'section',
      targetId: 's2',
      effect: 'show',
      when: { questionId: 'sq1', operator: 'equals', value: 'go' },
    },
  ];
  return survey;
};

export const questionFlowJumpSurvey = (): SurveyShape => ({
  _id: "survey-q-jump-1",
  publicId: "pub-q-jump-1",
  title: "Question Flow Jump Survey",
  description: "Verifies jump-to-question runtime behavior",
  status: "draft",
  type: "open_ended",
  questions: [
    {
      id: "q1",
      type: "single_choice",
      title: "Q1",
      options: ["Yes", "No"],
      order: 1,
      required: true,
    },
    {
      id: "q8",
      type: "short_text",
      title: "Q8",
      order: 8,
      required: true,
    },
    {
      id: "q9",
      type: "short_text",
      title: "Q9",
      order: 9,
      required: true,
    },
  ],
  sections: [],
  visibilityRules: [],
  navigationRules: [
    {
      id: "nav-q1-yes-q9",
      fromSectionId: null,
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q9" },
    },
    {
      id: "nav-q1-no-q8",
      fromSectionId: null,
      priority: 9,
      when: { questionId: "q1", operator: "equals", value: "No" },
      action: { type: "jump_to_question", targetQuestionId: "q8" },
    },
  ],
  settings: {
    presentationMode: "single_page",
    isSectional: false,
    autoAdvanceThreshold: null,
  },
  themeColor: "#10B981",
  thankYouMessage: "Thank you for completing this survey!",
  showProgress: true,
  oneResponsePerRecipient: true,
  isWhitelistEnabled: false,
});

export const sectionSameSectionJumpSurvey = (): SurveyShape => ({
  _id: "survey-s-jump-1",
  publicId: "pub-s-jump-1",
  title: "Section Same Jump Survey",
  description: "Validates same-section jump-to-question logic",
  status: "draft",
  type: "open_ended",
  questions: [
    { id: "q1", type: "short_text", title: "Name?", order: 1, sectionId: "bio", required: true },
    {
      id: "q3",
      type: "single_choice",
      title: "Nationality?",
      options: ["Kenyan", "Other"],
      order: 3,
      sectionId: "bio",
      required: true,
    },
    { id: "q4", type: "short_text", title: "Specify your Nationality", order: 4, sectionId: "bio", required: true },
    { id: "q5", type: "short_text", title: "County of Birth?", order: 5, sectionId: "bio", required: true },
    { id: "q6", type: "short_text", title: "Level of education", order: 6, sectionId: "education", required: true },
  ],
  sections: [
    { id: "bio", title: "Bio", order: 0, questionIds: ["q1", "q3", "q4", "q5"] },
    { id: "education", title: "Education", order: 1, questionIds: ["q6"] },
  ],
  visibilityRules: [],
  navigationRules: [
    {
      id: "nav-q3-kenyan-q5",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ],
  settings: {
    presentationMode: "multi_step",
    isSectional: true,
    autoAdvanceThreshold: null,
  },
  themeColor: "#10B981",
  thankYouMessage: "Thank you for completing this survey!",
  showProgress: true,
  oneResponsePerRecipient: true,
  isWhitelistEnabled: false,
});

export const sectionSkipSurvey = (): SurveyShape => ({
  _id: "survey-s-skip-1",
  publicId: "pub-s-skip-1",
  title: "Section Skip Survey",
  description: "Validates skip logic in section-based mode",
  status: "draft",
  type: "open_ended",
  questions: [
    {
      id: "q1",
      type: "single_choice",
      title: "Path choice",
      options: ["Skip path", "Continue path"],
      order: 1,
      sectionId: "s1",
      required: true,
    },
    { id: "q2", type: "short_text", title: "Q2", order: 2, sectionId: "s1", required: true },
    { id: "q3", type: "short_text", title: "Q3", order: 3, sectionId: "s1", required: true },
    { id: "q4", type: "short_text", title: "Q4", order: 4, sectionId: "s2", required: true },
  ],
  sections: [
    { id: "s1", title: "Section 1", order: 0, questionIds: ["q1", "q2", "q3"] },
    { id: "s2", title: "Section 2", order: 1, questionIds: ["q4"] },
  ],
  visibilityRules: [],
  navigationRules: [
    {
      id: "nav-skip-q1",
      fromSectionId: "s1",
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Skip path" },
      action: { type: "skip", skipCount: 2 },
    },
  ],
  settings: {
    presentationMode: "multi_step",
    isSectional: true,
    autoAdvanceThreshold: null,
  },
  themeColor: "#10B981",
  thankYouMessage: "Thank you for completing this survey!",
  showProgress: true,
  oneResponsePerRecipient: true,
  isWhitelistEnabled: false,
});
