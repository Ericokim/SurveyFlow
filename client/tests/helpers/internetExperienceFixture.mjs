import fs from 'node:fs';
import path from 'node:path';

const fixtureCandidates = [
  path.resolve(process.cwd(), '../server/data/ieq.combined.master.json'),
  path.resolve(process.cwd(), 'server/data/ieq.combined.master.json'),
  path.resolve(process.cwd(), 'tests/fixtures/internet-experience.json'),
];

const fixturePath =
  fixtureCandidates.find((candidate) => fs.existsSync(candidate)) ||
  fixtureCandidates[0];

export function loadInternetExperienceFixture() {
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return parsed?.runtimeOutputs?.finalSeed || parsed;
}

function buildCondition(questionId, rule) {
  if (!questionId) return null;
  if (rule?.value !== undefined) {
    return { questionId, operator: 'equals', value: rule.value };
  }
  if (rule?.valueContains !== undefined) {
    return { questionId, operator: 'in', value: [rule.valueContains] };
  }
  if (
    rule?.action &&
    (rule?.target || rule?.targetQuestionId || rule?.targetSectionId)
  ) {
    return { questionId, operator: 'exists' };
  }
  return null;
}

export function toRuntimeSurvey(ieq) {
  const questionList = Array.isArray(ieq.questions) ? ieq.questions : [];
  const perQuestionValidation = ieq?.validationRules?.perQuestion || {};
  const questions = questionList.map((question) => ({
    ...question,
    allowOther:
      question.allowOther !== undefined
        ? question.allowOther
        : question.hasOther !== undefined
          ? Boolean(question.hasOther)
          : undefined,
    validation: {
      ...(question.validation || {}),
      ...(perQuestionValidation[question.id] || {}),
    },
  }));

  const sectionOrder = [...(ieq.sections || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const sections = sectionOrder.map((section) => {
    const questionIds = questions
      .filter((question) => question.sectionId === section.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((question) => question.id);

    return {
      id: section.id,
      title: section.title,
      description: section.description || '',
      order: section.order ?? 0,
      questionIds,
    };
  });

  const visibilityRules = [];
  const navigationRules = [];
  let visIndex = 0;
  let navIndex = 0;

  for (const question of questions) {
    const visibility = question.visibility;
    if (
      visibility?.dependsOn &&
      Array.isArray(visibility.showIf) &&
      visibility.showIf.length > 0
    ) {
      visibilityRules.push({
        id: `vis_question_${++visIndex}`,
        targetType: 'question',
        targetId: question.id,
        effect: 'show',
        when: {
          questionId: visibility.dependsOn,
          operator: 'in',
          value: visibility.showIf,
        },
        priority: 0,
      });
    }
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const flowRule of ieq.flowRules || []) {
    const sourceQuestionId = flowRule?.questionId;
    const sourceSectionId = questionById.get(sourceQuestionId)?.sectionId || null;
    for (const rule of flowRule?.rules || []) {
      const condition = buildCondition(sourceQuestionId, rule);
      if (!condition) continue;

      if (rule.action === 'go_to_section' && rule.target) {
        navigationRules.push({
          id: `nav_${++navIndex}`,
          fromSectionId: sourceSectionId,
          when: condition,
          action: { type: 'jump', targetSectionId: rule.target },
          priority: 0,
        });
      }

      if ((rule.action === 'go_to_question' || rule.action === 'jump_to_question') && rule.target) {
        navigationRules.push({
          id: `nav_${++navIndex}`,
          fromSectionId: sourceSectionId,
          when: condition,
          action: { type: 'jump_to_question', targetQuestionId: rule.target },
          priority: 0,
        });
      }

      if (rule.action === 'end' || rule.action === 'terminate') {
        navigationRules.push({
          id: `nav_${++navIndex}`,
          fromSectionId: sourceSectionId,
          when: condition,
          action: { type: 'terminate' },
          priority: 0,
        });
      }

      if (rule.action === 'show_question' && rule.target) {
        visibilityRules.push({
          id: `vis_flow_question_${++visIndex}`,
          targetType: 'question',
          targetId: rule.target,
          effect: 'show',
          when: condition,
          priority: 0,
        });
      }

      if (rule.action === 'show_section' && rule.target) {
        if (sourceSectionId && sourceSectionId === rule.target) continue;
        visibilityRules.push({
          id: `vis_flow_section_${++visIndex}`,
          targetType: 'section',
          targetId: rule.target,
          effect: 'show',
          when: condition,
          priority: 0,
        });
      }
    }
  }

  return {
    _id: 'ieq-survey',
    publicId: 'ieq-public',
    title: ieq.surveyTitle,
    description: ieq.sections?.[0]?.description || '',
    status: 'published',
    questions,
    sections,
    visibilityRules,
    navigationRules,
    settings: {
      presentationMode: sections.length > 1 ? 'multi_step' : 'single_page',
      isSectional: sections.length > 1,
      autoAdvanceThreshold: null,
    },
    themeColor: ieq.themeColor,
    thankYouMessage: ieq.thankYouMessage,
    showProgress: true,
    oneResponsePerRecipient: false,
    isWhitelistEnabled: false,
  };
}
