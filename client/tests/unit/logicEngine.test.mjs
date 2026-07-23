import { test } from "node:test";
import { deepEqual } from "node:assert";
import {
  computeVisibleQuestionsInSection,
  computeVisibleQuestionsForQuestionFlow,
  evaluateCondition,
  evaluateNavigationAction,
  getOrphanedAnswerKeys,
  getNextSectionId,
  getVisibleQuestionIds,
  shouldTerminate,
} from "../../src/lib/utils/logicEngine.js";
import {
  getFixtureScenarios,
  getFixtureSurvey,
  getQuestionFlowFixtureScenarios,
  getQuestionFlowFixtureSurvey,
  getForwardOnlyInvalidRules,
} from "../helpers/logicFixture.mjs";

const sections = [{ id: "s1", questionIds: ["q1", "q2", "q3"] }];
const questions = [
  { id: "q1", order: 1 },
  { id: "q2", order: 2 },
  { id: "q3", order: 3 },
];
const visibleSectionIds = new Set(["s1"]);
const visibleQuestionIds = new Set(["q1", "q2", "q3"]);

test("evaluateNavigationAction - blocks backward jump_to_question when forward guard is enabled", () => {
  const navigationRules = [
    {
      id: "nav_back",
      fromSectionId: "s1",
      when: { questionId: "q2", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q1" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q2: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q2",
    new Set(["q2"]),
    true
  );

  deepEqual(result, null);
});

test("evaluateNavigationAction - allows forward jump_to_question when forward guard is enabled", () => {
  const navigationRules = [
    {
      id: "nav_forward",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q3" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"]),
    true
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q3",
    targetSectionId: "s1",
    sourceQuestionId: "q1",
    ruleId: "nav_forward",
  });
});

test("evaluateNavigationAction - preserves legacy behavior when forward guard is disabled", () => {
  const navigationRules = [
    {
      id: "nav_legacy",
      fromSectionId: "s1",
      when: { questionId: "q2", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q1" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q2: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q2",
    new Set(["q2"])
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q1",
    targetSectionId: "s1",
    sourceQuestionId: "q2",
    ruleId: "nav_legacy",
  });
});

test("evaluateNavigationAction - supports jump_to_section action type alias", () => {
  const navigationRules = [
    {
      id: "nav_jump_alias",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_section", targetSectionId: "s1" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "jump_section",
    targetSectionId: "s1",
    ruleId: "nav_jump_alias",
  });
});

test("evaluateNavigationAction - supports end_survey action type alias", () => {
  const navigationRules = [
    {
      id: "nav_end_alias",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "end_survey" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "terminate",
    ruleId: "nav_end_alias",
  });
});

test("evaluateNavigationAction - supports unconditional section jump rules (when=true)", () => {
  const navigationRules = [
    {
      id: "nav_unconditional_section_jump",
      fromSectionId: "s1",
      when: true,
      action: { type: "jump", targetSectionId: "s2" },
      priority: -100,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    [
      { id: "s1", questionIds: ["q1"] },
      { id: "s2", questionIds: [] },
    ],
    [{ id: "q1", sectionId: "s1", order: 1 }],
    navigationRules,
    { q1: "yes" },
    new Set(["s1", "s2"]),
    new Set(["q1"]),
    null,
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "jump_section",
    targetSectionId: "s2",
    ruleId: "nav_unconditional_section_jump",
  });
});

test('evaluateNavigationAction - supports "End survey" action label variant', () => {
  const navigationRules = [
    {
      id: "nav_end_label_variant",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "End survey" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "terminate",
    ruleId: "nav_end_label_variant",
  });
});

test("evaluateNavigationAction - supports terminate branch from multiple choice option logic", () => {
  const navigationRules = [
    {
      id: "nav_multi_end",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "in", value: ["Option 1"] },
      action: { type: "end_survey" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: ["Option 1"] },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "terminate",
    ruleId: "nav_multi_end",
  });
});

test("evaluateNavigationAction - allows jump_to_question without section mapping in question flow", () => {
  const navigationRules = [
    {
      id: "nav_no_section",
      fromSectionId: null,
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q3" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    null,
    [],
    questions,
    navigationRules,
    { q1: "yes" },
    new Set(),
    visibleQuestionIds,
    "q1",
    new Set(["q1"]),
    true
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q3",
    targetSectionId: null,
    sourceQuestionId: "q1",
    ruleId: "nav_no_section",
  });
});

test("evaluateNavigationAction - treats legacy jump rules with targetQuestionId as question jumps", () => {
  const navigationRules = [
    {
      id: "nav_legacy_jump_q",
      fromSectionId: null,
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump", targetQuestionId: "q3" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    null,
    [],
    questions,
    navigationRules,
    { q1: "yes" },
    new Set(),
    visibleQuestionIds,
    "q1",
    new Set(["q1"]),
    true
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q3",
    targetSectionId: null,
    sourceQuestionId: "q1",
    ruleId: "nav_legacy_jump_q",
  });
});

test("computeVisibleQuestionsInSection - hides branch window before source answer", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
  ];
  const rules = [
    {
      id: "nav-q3-kenyan-q5",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visible = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Jane" },
    "bio"
  );

  deepEqual(visible.map((q) => q.id), ["q1", "q3"]);
});

test("computeVisibleQuestionsInSection - jump branch hides intermediate questions", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
  ];
  const rules = [
    {
      id: "nav-q3-kenyan-q5",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visible = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Jane", q3: "Kenyan" },
    "bio"
  );

  deepEqual(visible.map((q) => q.id), ["q1", "q3", "q5"]);
});

test("computeVisibleQuestionsInSection - continue path keeps jump target hidden", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
  ];
  const rules = [
    {
      id: "nav-q3-kenyan-q5",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visibleAfterOther = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Jane", q3: "Other" },
    "bio"
  );
  deepEqual(visibleAfterOther.map((q) => q.id), ["q1", "q3", "q4"]);

  const visibleAfterQ4 = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Jane", q3: "Other", q4: "Ugandan" },
    "bio"
  );
  deepEqual(visibleAfterQ4.map((q) => q.id), ["q1", "q3", "q4"]);
});

test("computeVisibleQuestionsInSection - cross-section jump hides remaining local follow-ups", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
    { id: "q6", order: 6 },
  ];

  const rules = [
    {
      id: "nav-q3-kenyan-q6",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q6" },
    },
    {
      id: "nav-q3-other-work",
      fromSectionId: "bio",
      priority: 9,
      when: { questionId: "q3", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "work" },
    },
    {
      id: "nav-q3-african-q5",
      fromSectionId: "bio",
      priority: 8,
      when: { questionId: "q3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visibleOther = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "Other" },
    "bio"
  );
  deepEqual(visibleOther.map((q) => q.id), ["q1", "q2", "q3"]);

  const visibleKenyan = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "Kenyan" },
    "bio"
  );
  deepEqual(visibleKenyan.map((q) => q.id), ["q1", "q2", "q3", "q6"]);

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "African" },
    "bio"
  );
  deepEqual(visibleAfrican.map((q) => q.id), ["q1", "q2", "q3", "q5"]);
});

test("computeVisibleQuestionsInSection - cross-section section jumps keep local follow-up questions visible", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
    { id: "q6", order: 6 },
  ];

  const rules = [
    {
      id: "nav-q2-mdu",
      fromSectionId: "profile",
      priority: 10,
      when: {
        questionId: "q2",
        operator: "equals",
        value: "Multi-Dwelling Unit (Apartment/Estate)",
      },
      action: { type: "jump", targetSectionId: "mdus" },
    },
    {
      id: "nav-q2-sdu",
      fromSectionId: "profile",
      priority: 10,
      when: {
        questionId: "q2",
        operator: "equals",
        value: "Single-Dwelling Unit (Standalone house)",
      },
      action: { type: "jump", targetSectionId: "sdus" },
    },
  ];

  const beforeChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Parklands" },
    "profile"
  );
  deepEqual(beforeChoice.map((q) => q.id), ["q1", "q2", "q3", "q4", "q5", "q6"]);

  const afterChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    {
      q1: "Parklands",
      q2: "Multi-Dwelling Unit (Apartment/Estate)",
    },
    "profile"
  );
  deepEqual(afterChoice.map((q) => q.id), ["q1", "q2", "q3", "q4", "q5", "q6"]);
});

test("computeVisibleQuestionsInSection - malformed jump_to_question target does not hide follow-up questions", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
    { id: "q6", order: 6 },
  ];

  const rules = [
    {
      id: "nav-q2-malformed-mdu",
      fromSectionId: "profile",
      priority: 10,
      when: {
        questionId: "q2",
        operator: "equals",
        value: "Multi-Dwelling Unit (Apartment/Estate)",
      },
      action: { type: "jump_to_question", targetQuestionId: "mdus" },
    },
  ];

  const afterChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    {
      q1: "Parklands",
      q2: "Multi-Dwelling Unit (Apartment/Estate)",
    },
    "profile"
  );

  deepEqual(afterChoice.map((q) => q.id), ["q1", "q2", "q3", "q4", "q5", "q6"]);
});

test("computeVisibleQuestionsInSection - applies source-question rules even with stale fromSectionId", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
    { id: "q6", order: 6 },
  ];

  const rules = [
    {
      id: "nav-q3-kenyan-q6-legacy",
      fromSectionId: "legacy_bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q6" },
    },
    {
      id: "nav-q3-other-work-legacy",
      fromSectionId: "legacy_bio",
      priority: 9,
      when: { questionId: "q3", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "work" },
    },
    {
      id: "nav-q3-african-q5-legacy",
      fromSectionId: "legacy_bio",
      priority: 8,
      when: { questionId: "q3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visibleBeforeChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male" },
    "bio"
  );
  deepEqual(visibleBeforeChoice.map((q) => q.id), ["q1", "q2", "q3"]);

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "African" },
    "bio"
  );
  deepEqual(visibleAfrican.map((q) => q.id), ["q1", "q2", "q3", "q5"]);
});

test("computeVisibleQuestionsInSection - resolves legacy numeric question references", () => {
  const sectionQuestions = [
    { id: "bio_name", title: "Name?", order: 1 },
    { id: "bio_gender", title: "Gender?", order: 2 },
    { id: "bio_nationality", title: "Nationality?", order: 3 },
    { id: "bio_origin", title: "Select your African country of origin", order: 4 },
    { id: "bio_specify", title: "Specify your Nationality", order: 5 },
    { id: "bio_county", title: "Specify your county", order: 6 },
  ];

  const rules = [
    {
      id: "legacy-kenyan",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "Q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "Q6" },
    },
    {
      id: "legacy-african",
      fromSectionId: "bio",
      priority: 9,
      when: { questionId: "3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "4" },
    },
  ];

  const visibleBeforeChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { bio_name: "Eric", bio_gender: "Male" },
    "bio"
  );
  deepEqual(visibleBeforeChoice.map((q) => q.id), [
    "bio_name",
    "bio_gender",
    "bio_nationality",
  ]);

  const visibleKenyan = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { bio_name: "Eric", bio_gender: "Male", bio_nationality: "Kenyan" },
    "bio"
  );
  deepEqual(visibleKenyan.map((q) => q.id), [
    "bio_name",
    "bio_gender",
    "bio_nationality",
    "bio_county",
  ]);

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { bio_name: "Eric", bio_gender: "Male", bio_nationality: "African" },
    "bio"
  );
  deepEqual(visibleAfrican.map((q) => q.id), [
    "bio_name",
    "bio_gender",
    "bio_nationality",
    "bio_origin",
  ]);
});

test("computeVisibleQuestionsInSection - infers stale source/target IDs from option and visibleIf metadata", () => {
  const sectionQuestions = [
    { id: "q1", title: "Name?", order: 1 },
    { id: "q2", title: "Gender?", order: 2 },
    {
      id: "q3",
      title: "Nationality?",
      order: 3,
      options: ["Kenyan", "Other", "African"],
    },
    {
      id: "q4",
      title: "Select your African country of origin",
      order: 4,
      options: ["UG", "TZ"],
      logic: {
        visibleIf: { questionId: "q3", operator: "equals", value: "African" },
      },
    },
    {
      id: "q5",
      title: "Specify your county",
      order: 5,
      logic: {
        visibleIf: { questionId: "q3", operator: "equals", value: "Kenyan" },
      },
    },
  ];

  const rules = [
    {
      id: "legacy-kenyan",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "legacy_source_q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "legacy_target_q5" },
    },
    {
      id: "legacy-other",
      fromSectionId: "bio",
      priority: 9,
      when: { questionId: "legacy_source_q3", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "work" },
    },
    {
      id: "legacy-african",
      fromSectionId: "bio",
      priority: 8,
      when: { questionId: "legacy_source_q3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "legacy_target_q4" },
    },
  ];

  const visibleBeforeChoice = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male" },
    "bio"
  );
  deepEqual(visibleBeforeChoice.map((q) => q.id), ["q1", "q2", "q3"]);

  const visibleKenyan = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "Kenyan" },
    "bio"
  );
  deepEqual(visibleKenyan.map((q) => q.id), ["q1", "q2", "q3", "q5"]);

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "African" },
    "bio"
  );
  deepEqual(visibleAfrican.map((q) => q.id), ["q1", "q2", "q3", "q4"]);

  const visibleOther = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "Other" },
    "bio"
  );
  deepEqual(visibleOther.map((q) => q.id), ["q1", "q2", "q3"]);
});

test("evaluateNavigationAction - resolves rule by source question when fromSectionId is stale", () => {
  const localSections = [{ id: "bio", questionIds: ["q1", "q2", "q3", "q4"] }];
  const localQuestions = [
    { id: "q1", sectionId: "bio", order: 1 },
    { id: "q2", sectionId: "bio", order: 2 },
    { id: "q3", sectionId: "bio", order: 3 },
    { id: "q4", sectionId: "bio", order: 4 },
  ];
  const navigationRules = [
    {
      id: "nav-stale-from-section",
      fromSectionId: "legacy_bio",
      when: { questionId: "q3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "q4" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "bio",
    localSections,
    localQuestions,
    navigationRules,
    { q3: "African" },
    new Set(["bio"]),
    new Set(["q1", "q2", "q3", "q4"]),
    "q3",
    new Set(["q3"]),
    true
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q4",
    targetSectionId: "bio",
    sourceQuestionId: "q3",
    ruleId: "nav-stale-from-section",
  });
});

test("computeVisibleQuestionsInSection - uses incoming section order for branch pruning", () => {
  // Intentionally inconsistent numeric order values to ensure pruning follows
  // authored incoming sequence, not local order-based re-sorting.
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 }, // source
    { id: "q4", order: 5 }, // should be hidden for African path
    { id: "q5", order: 4 }, // target
    { id: "q6", order: 6 }, // sibling target
  ];

  const rules = [
    {
      id: "nav-q3-kenyan-q6",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump_to_question", targetQuestionId: "q6" },
    },
    {
      id: "nav-q3-african-q5",
      fromSectionId: "bio",
      priority: 9,
      when: { questionId: "q3", operator: "equals", value: "African" },
      action: { type: "jump_to_question", targetQuestionId: "q5" },
    },
  ];

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "African" },
    "bio"
  );

  deepEqual(visibleAfrican.map((q) => q.id), ["q1", "q2", "q3", "q5"]);
});

test("computeVisibleQuestionsInSection - supports legacy root targetQuestionId shape", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
    { id: "q5", order: 5 },
    { id: "q6", order: 6 },
  ];

  const rules = [
    {
      id: "legacy-q3-kenyan",
      fromSectionId: "bio",
      priority: 10,
      when: { questionId: "q3", operator: "equals", value: "Kenyan" },
      action: { type: "jump" },
      targetQuestionId: "q6",
    },
    {
      id: "legacy-q3-african",
      fromSectionId: "bio",
      priority: 9,
      when: { questionId: "q3", operator: "equals", value: "African" },
      action: { type: "jump" },
      targetQuestionId: "q4",
    },
  ];

  const visibleAfrican = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Eric", q2: "Male", q3: "African", q4: "TZ" },
    "bio"
  );

  deepEqual(visibleAfrican.map((q) => q.id), ["q1", "q2", "q3", "q4"]);
});

test("computeVisibleQuestionsInSection - skip action hides next questions when condition matches", () => {
  const sectionQuestions = [
    { id: "q1", order: 1 },
    { id: "q2", order: 2 },
    { id: "q3", order: 3 },
    { id: "q4", order: 4 },
  ];
  const rules = [
    {
      id: "nav-skip-q1",
      fromSectionId: "s1",
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Skip" },
      action: { type: "skip", skipCount: 2 },
    },
  ];

  const visibleWithoutAnswer = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    {},
    "s1"
  );
  deepEqual(visibleWithoutAnswer.map((q) => q.id), ["q1", "q2", "q3", "q4"]);

  const visibleWithSkip = computeVisibleQuestionsInSection(
    sectionQuestions,
    rules,
    { q1: "Skip" },
    "s1"
  );
  deepEqual(visibleWithSkip.map((q) => q.id), ["q1", "q4"]);
});

test("getOrphanedAnswerKeys - removes answers for hidden sibling branch question", () => {
  const previousVisibleQuestions = [{ id: "q1" }, { id: "q4" }, { id: "q5" }];
  const currentVisibleQuestions = [{ id: "q1" }, { id: "q5" }];
  const answers = {
    q1: "Jane",
    q4: "Ugandan",
    q5: "Nairobi",
  };

  deepEqual(
    getOrphanedAnswerKeys(previousVisibleQuestions, currentVisibleQuestions, answers),
    ["q4"]
  );
});

test("computeVisibleQuestionsForQuestionFlow - picks matched branch target and hides sibling target", () => {
  const orderedQuestions = [
    { id: "q1", order: 1 },
    { id: "q8", order: 8 },
    { id: "q9", order: 9 },
  ];
  const rules = [
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
  ];

  const yesPath = computeVisibleQuestionsForQuestionFlow(
    orderedQuestions,
    rules,
    { q1: "Yes" }
  );
  deepEqual(yesPath.map((q) => q.id), ["q1", "q9"]);

  const noPath = computeVisibleQuestionsForQuestionFlow(
    orderedQuestions,
    rules,
    { q1: "No" }
  );
  deepEqual(noPath.map((q) => q.id), ["q1", "q8"]);
});

test("computeVisibleQuestionsForQuestionFlow - hides sibling target for legacy jump rule shape", () => {
  const orderedQuestions = [
    { id: "q1", order: 1 },
    { id: "q8", order: 8 },
    { id: "q9", order: 9 },
  ];
  const rules = [
    {
      id: "nav-q1-yes-q9",
      fromSectionId: null,
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q9" },
    },
    {
      id: "nav-q1-no-q8-legacy",
      fromSectionId: null,
      priority: 9,
      when: { questionId: "q1", operator: "equals", value: "No" },
      action: { type: "jump", targetQuestionId: "q8" },
    },
  ];

  const yesPath = computeVisibleQuestionsForQuestionFlow(
    orderedQuestions,
    rules,
    { q1: "Yes" }
  );

  deepEqual(yesPath.map((q) => q.id), ["q1", "q9"]);
});

test("evaluateNavigationAction - deterministic tie-break when priorities are equal", () => {
  const navigationRules = [
    {
      id: "rule-b",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q2" },
      priority: 10,
    },
    {
      id: "rule-a",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q3" },
      priority: 10,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "yes" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "jump_question",
    targetQuestionId: "q3",
    targetSectionId: "s1",
    sourceQuestionId: "q1",
    ruleId: "rule-a",
  });
});

test("evaluateNavigationAction - conditional question jump wins over unconditional section fallback", () => {
  const navigationRules = [
    {
      id: "section-fallback",
      fromSectionId: "s1",
      when: true,
      action: { type: "jump", targetSectionId: "s3" },
      priority: 100,
    },
    {
      id: "other-to-s4",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "s4" },
      priority: 0,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    [
      { id: "s1", questionIds: ["q1"] },
      { id: "s2", questionIds: [] },
      { id: "s3", questionIds: [] },
      { id: "s4", questionIds: [] },
    ],
    [{ id: "q1", sectionId: "s1", order: 1 }],
    navigationRules,
    { q1: "Other" },
    new Set(["s1", "s2", "s3", "s4"]),
    new Set(["q1"]),
    null,
    new Set(["q1"])
  );

  deepEqual(result, {
    type: "jump_section",
    targetSectionId: "s4",
    ruleId: "other-to-s4",
  });
});

test("evaluateNavigationAction - returns null fallback when no rule matches", () => {
  const navigationRules = [
    {
      id: "rule-match-yes",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "yes" },
      action: { type: "jump_to_question", targetQuestionId: "q3" },
      priority: 10,
    },
  ];

  const result = evaluateNavigationAction(
    "s1",
    sections,
    questions,
    navigationRules,
    { q1: "no" },
    visibleSectionIds,
    visibleQuestionIds,
    "q1",
    new Set(["q1"])
  );

  deepEqual(result, null);
});

test("computeVisibleQuestionsForQuestionFlow - deterministic sibling target selection on equal priority", () => {
  const orderedQuestions = [
    { id: "q1", order: 1 },
    { id: "q8", order: 8 },
    { id: "q9", order: 9 },
  ];
  const rules = [
    {
      id: "rule-b",
      fromSectionId: null,
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q8" },
    },
    {
      id: "rule-a",
      fromSectionId: null,
      priority: 10,
      when: { questionId: "q1", operator: "equals", value: "Yes" },
      action: { type: "jump_to_question", targetQuestionId: "q9" },
    },
  ];

  const path = computeVisibleQuestionsForQuestionFlow(
    orderedQuestions,
    rules,
    { q1: "Yes" }
  );
  deepEqual(path.map((q) => q.id), ["q1", "q9"]);
});

test("evaluateCondition - supports nested AND/OR condition groups", () => {
  const condition = {
    logic: "and",
    conditions: [
      { questionId: "q1", operator: "equals", value: "Yes" },
      {
        logic: "or",
        conditions: [
          { questionId: "q2", operator: "equals", value: "A" },
          { questionId: "q2", operator: "equals", value: "B" },
        ],
      },
    ],
  };

  deepEqual(evaluateCondition(condition, { q1: "Yes", q2: "B" }), true);
  deepEqual(evaluateCondition(condition, { q1: "Yes", q2: "C" }), false);
});

test("evaluateCondition - supports option-logic matching for multiple choice answers via in operator", () => {
  const condition = {
    questionId: "q1",
    operator: "in",
    value: ["Option 1"],
  };

  deepEqual(evaluateCondition(condition, { q1: ["Option 1", "Option 2"] }), true);
  deepEqual(evaluateCondition(condition, { q1: ["Option 2"] }), false);
});

test("evaluateCondition - supports equals operator for multiple choice array answers", () => {
  const condition = {
    questionId: "q1",
    operator: "equals",
    value: "Option 1",
  };

  deepEqual(evaluateCondition(condition, { q1: ["Option 1", "Option 2"] }), true);
  deepEqual(evaluateCondition(condition, { q1: ["Option 2"] }), false);
});

test("getVisibleQuestionIds - preview and live modes evaluate same visibility rules", () => {
  const sampleQuestions = [
    { id: "q1" },
    { id: "q2" },
  ];
  const visibilityRules = [
    {
      id: "vr1",
      targetType: "question",
      targetId: "q2",
      effect: "show",
      when: { questionId: "q1", operator: "equals", value: "show" },
      priority: 1,
    },
  ];

  const live = getVisibleQuestionIds(
    sampleQuestions,
    visibilityRules,
    { q1: "hide" },
    "live"
  );
  const preview = getVisibleQuestionIds(
    sampleQuestions,
    visibilityRules,
    { q1: "hide" },
    "preview"
  );

  deepEqual([...preview], [...live]);
  deepEqual([...preview], ["q1"]);
});

test("getNextSectionId - supports jump_to_section alias in section navigation", () => {
  const sectionList = [
    { id: "s1", order: 1 },
    { id: "s2", order: 2 },
  ];
  const navigationRules = [
    {
      id: "nav_section_alias",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "go" },
      action: { type: "jump_to_section", targetSectionId: "s2" },
      priority: 1,
    },
  ];

  const nextSectionId = getNextSectionId(
    "s1",
    sectionList,
    navigationRules,
    { q1: "go" },
    new Set(["s1", "s2"])
  );

  deepEqual(nextSectionId, "s2");
});

test("getNextSectionId - evaluates unconditional section fallback after conditional branch rules", () => {
  const sectionList = [
    { id: "s1", order: 1 },
    { id: "s2", order: 2 },
    { id: "s3", order: 3 },
    { id: "s4", order: 4 },
  ];
  const navigationRules = [
    {
      id: "section-fallback",
      fromSectionId: "s1",
      when: true,
      action: { type: "jump", targetSectionId: "s3" },
      priority: 100,
    },
    {
      id: "other-branch",
      fromSectionId: "s1",
      when: { questionId: "q1", operator: "equals", value: "Other" },
      action: { type: "jump", targetSectionId: "s4" },
      priority: 0,
    },
  ];

  const nextSectionId = getNextSectionId(
    "s1",
    sectionList,
    navigationRules,
    { q1: "Other" },
    new Set(["s1", "s2", "s3", "s4"])
  );

  deepEqual(nextSectionId, "s4");
});

test("shouldTerminate - supports end_survey alias in global rules", () => {
  const navigationRules = [
    {
      id: "terminate_alias",
      fromSectionId: null,
      when: { questionId: "q1", operator: "equals", value: "stop" },
      action: { type: "end_survey" },
      priority: 2,
    },
  ];

  deepEqual(shouldTerminate(navigationRules, { q1: "stop" }), true);
  deepEqual(shouldTerminate(navigationRules, { q1: "continue" }), false);
});

test("dynamic fixture scenarios - navigation resolves all configured actions", () => {
  const survey = getFixtureSurvey();
  const scenarios = getFixtureScenarios();
  const allVisibleSectionIds = new Set((survey.sections || []).map((s) => s.id));
  const allVisibleQuestionIds = new Set((survey.questions || []).map((q) => q.id));

  for (const scenario of scenarios) {
    const result = evaluateNavigationAction(
      "bio",
      survey.sections || [],
      survey.questions || [],
      survey.navigationRules || [],
      { q1: "Jane", q3: scenario.answer },
      allVisibleSectionIds,
      allVisibleQuestionIds,
      "q3",
      new Set(["q3"]),
      true
    );

    if (scenario.expected.action === "fallback") {
      deepEqual(result, null);
      continue;
    }

    if (scenario.expected.action === "terminate") {
      deepEqual(result?.type, "terminate");
      continue;
    }

    if (scenario.expected.action === "jump_section") {
      deepEqual(result?.type, "jump_section");
      deepEqual(result?.targetSectionId, scenario.expected.targetSectionId);
      continue;
    }

    deepEqual(result?.type, "jump_question");
    deepEqual(result?.targetSectionId, scenario.expected.targetSectionId);
    deepEqual(result?.targetQuestionId, scenario.expected.targetQuestionId);
  }
});

test("dynamic fixture scenarios - forward-only guard blocks invalid rules", () => {
  const survey = getFixtureSurvey();
  const invalidRules = getForwardOnlyInvalidRules();
  const allVisibleSectionIds = new Set((survey.sections || []).map((s) => s.id));
  const allVisibleQuestionIds = new Set((survey.questions || []).map((q) => q.id));

  for (const rule of invalidRules) {
    const guarded = evaluateNavigationAction(
      "bio",
      survey.sections || [],
      survey.questions || [],
      [rule],
      { q3: "Kenyan" },
      allVisibleSectionIds,
      allVisibleQuestionIds,
      "q3",
      new Set(["q3"]),
      true
    );
    deepEqual(guarded, null);

    const unguarded = evaluateNavigationAction(
      "bio",
      survey.sections || [],
      survey.questions || [],
      [rule],
      { q3: "Kenyan" },
      allVisibleSectionIds,
      allVisibleQuestionIds,
      "q3",
      new Set(["q3"]),
      false
    );
    deepEqual(unguarded?.type, "jump_question");
  }
});

test("dynamic fixture scenarios - question-based flow resolves all configured actions", () => {
  const survey = getQuestionFlowFixtureSurvey();
  const scenarios = getQuestionFlowFixtureScenarios();
  const allVisibleQuestionIds = new Set((survey.questions || []).map((q) => q.id));

  for (const scenario of scenarios) {
    const result = evaluateNavigationAction(
      null,
      survey.sections || [],
      survey.questions || [],
      survey.navigationRules || [],
      { qq1: scenario.answer },
      new Set(),
      allVisibleQuestionIds,
      "qq1",
      new Set(["qq1"]),
      true
    );

    if (scenario.expected.action === "fallback") {
      deepEqual(result, null);
      continue;
    }

    deepEqual(result?.type, "jump_question");
    deepEqual(result?.targetQuestionId, scenario.expected.targetQuestionId);
  }
});
