/**
 * IEQ Seeder - upsert Internet Experience Questionnaire only
 *
 * Loads IEQ fixture JSON and maps it into existing survey runtime shape.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import connectDB from './config/db.js';
import Survey from './models/survey.models.js';
import SurveyVersion from './models/survey_version.models.js';
import User from './models/user.models.js';

dotenv.config();

const fixturePath = path.resolve(
  process.cwd(),
  'server/data/ieq.combined.master.json'
);
const publishSeed =
  process.argv.includes('--publish') || process.env.IEQ_PUBLISH === 'true';

const loadIEQFixture = () => {
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  if (parsed?.runtimeOutputs?.finalSeed) return parsed.runtimeOutputs.finalSeed;
  if (parsed?.runtimeOutputs?.createPayload) {
    return parsed.runtimeOutputs.createPayload;
  }
  if (parsed?.sharedSchema) return parsed.sharedSchema;
  return parsed;
};

const buildCondition = (questionId, rule) => {
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
};

const canonicalizeWhenForDedup = (when) => {
  if (when === true) return { type: 'always' };
  if (!when || typeof when !== 'object') return when ?? null;
  if (when.always === true) return { type: 'always' };
  if (String(when.type || '').toLowerCase() === 'always') {
    return { type: 'always' };
  }
  return when;
};

const dedupeNavigationRulesByCondition = (rules = []) => {
  const byCondition = new Map();
  for (const rule of rules || []) {
    const key = JSON.stringify({
      fromSectionId: rule?.fromSectionId ?? null,
      when: canonicalizeWhenForDedup(rule?.when),
    });
    byCondition.set(key, rule);
  }
  return [...byCondition.values()];
};

const dedupeVisibilityRulesByCondition = (rules = []) => {
  const byCondition = new Map();
  for (const rule of rules || []) {
    const key = JSON.stringify({
      targetType: rule?.targetType ?? null,
      targetId: rule?.targetId ?? null,
      effect: rule?.effect ?? null,
      when: rule?.when ?? null,
    });
    byCondition.set(key, rule);
  }
  return [...byCondition.values()];
};

const toRuntimeVersion = (ieq) => {
  const perQuestionValidation = ieq?.validationRules?.perQuestion || {};

  const questions = (ieq.questions || []).map((question) => ({
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

  const sections = [...(ieq.sections || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description || '',
      order: section.order ?? 0,
      questionIds: questions
        .filter((question) => question.sectionId === section.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((question) => question.id),
      required: false,
      randomizeQuestions: false,
      pageBreak: false,
    }));

  const visibilityRules = [];
  const navigationRules = [];
  let visibilityIndex = 0;
  let navigationIndex = 0;

  if (Array.isArray(ieq.visibilityRules)) {
    for (const rule of ieq.visibilityRules) {
      if (
        typeof rule?.targetType !== 'string' ||
        typeof rule?.targetId !== 'string' ||
        !rule.targetId ||
        !rule.when
      ) {
        continue;
      }
      visibilityRules.push({
        ...rule,
        id: rule.id || `ieq_vis_${++visibilityIndex}`,
      });
    }
  }

  for (const question of questions) {
    if (
      question.visibility?.dependsOn &&
      Array.isArray(question.visibility?.showIf) &&
      question.visibility.showIf.length > 0
    ) {
      visibilityRules.push({
        id: `ieq_vis_${++visibilityIndex}`,
        targetType: 'question',
        targetId: question.id,
        effect: 'show',
        when: {
          questionId: question.visibility.dependsOn,
          operator: 'in',
          value: question.visibility.showIf,
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
      const when = buildCondition(sourceQuestionId, rule);
      if (!when) continue;

      if (rule.action === 'go_to_section' && rule.target) {
        navigationRules.push({
          id: `ieq_nav_${++navigationIndex}`,
          fromSectionId: sourceSectionId,
          when,
          action: { type: 'jump', targetSectionId: rule.target },
          priority: 0,
        });
      }

      if (
        (rule.action === 'go_to_question' || rule.action === 'jump_to_question') &&
        rule.target
      ) {
        navigationRules.push({
          id: `ieq_nav_${++navigationIndex}`,
          fromSectionId: sourceSectionId,
          when,
          action: { type: 'jump_to_question', targetQuestionId: rule.target },
          priority: 0,
        });
      }

      if (rule.action === 'end' || rule.action === 'terminate') {
        navigationRules.push({
          id: `ieq_nav_${++navigationIndex}`,
          fromSectionId: sourceSectionId,
          when,
          action: { type: 'terminate' },
          priority: 0,
        });
      }

      if (rule.action === 'show_question' && rule.target) {
        visibilityRules.push({
          id: `ieq_vis_${++visibilityIndex}`,
          targetType: 'question',
          targetId: rule.target,
          effect: 'show',
          when,
          priority: 0,
        });
      }

      if (rule.action === 'show_section' && rule.target) {
        if (sourceSectionId && sourceSectionId === rule.target) continue;
        visibilityRules.push({
          id: `ieq_vis_${++visibilityIndex}`,
          targetType: 'section',
          targetId: rule.target,
          effect: 'show',
          when,
          priority: 0,
        });
      }
    }
  }

  if (Array.isArray(ieq.navigationRules)) {
    for (const rule of ieq.navigationRules) {
      const actionType = rule?.action?.type;

      if (actionType === 'jump') {
        const targetSectionId =
          typeof rule.action?.targetSectionId === 'string' &&
          rule.action.targetSectionId.trim().length > 0
            ? rule.action.targetSectionId
            : null;
        if (!targetSectionId) continue;
      }

      if (actionType === 'jump_to_question') {
        const targetQuestionId =
          typeof rule.action?.targetQuestionId === 'string' &&
          rule.action.targetQuestionId.trim().length > 0
            ? rule.action.targetQuestionId
            : null;
        if (!targetQuestionId) continue;
      }

      navigationRules.push({
        ...rule,
        id: rule.id || `ieq_nav_${++navigationIndex}`,
      });
    }
  }

  return {
    title: ieq.title || ieq.surveyTitle || 'Internet Experience Questionnaire',
    description:
      ieq.description ||
      'Survey to understand internet usage, performance, and future demand.',
    themeColor: ieq.themeColor,
    thankYouMessage: ieq.thankYouMessage,
    captureMetadata: Boolean(ieq?.metadata?.captureMetadata),
    sections,
    questions,
    visibilityRules: dedupeVisibilityRulesByCondition(visibilityRules),
    navigationRules: dedupeNavigationRulesByCondition(navigationRules),
    settings: {
      presentationMode: sections.length > 1 ? 'multi_step' : 'single_page',
      isSectional: sections.length > 1,
      autoAdvanceThreshold: null,
    },
  };
};

const seedIEQ = async () => {
  try {
    await connectDB();

    const user = await User.findOne({}).sort({ createdAt: 1 }).lean();
    if (!user) {
      throw new Error(
        'No users found. Run full seed first with `npm run data:import`.'
      );
    }

    const ieq = loadIEQFixture();
    const mapped = toRuntimeVersion(ieq);

    let survey = await Survey.findOne({
      companyId: user.companyId,
      title: mapped.title,
      isDeleted: false,
    });

    const getLatestVersionNumber = async (surveyId) => {
      const latestVersionDoc = await SurveyVersion.findOne({ surveyId })
        .sort({ version: -1 })
        .select('version')
        .lean();
      return Number.isFinite(latestVersionDoc?.version)
        ? latestVersionDoc.version
        : 0;
    };

    let targetVersion = 1;

    if (!survey) {
      survey = await Survey.create({
        companyId: user.companyId,
        createdBy: user._id,
        publicId: uuidv4(),
        title: mapped.title,
        description: mapped.description,
        status: publishSeed ? 'published' : 'draft',
        themeColor: mapped.themeColor,
        thankYouMessage: mapped.thankYouMessage,
        isWhitelistEnabled: false,
        showProgress: true,
        oneResponsePerRecipient: true,
        captureMetadata: mapped.captureMetadata,
        currentVersion: 1,
        publishedVersion: publishSeed ? 1 : null,
        publishedAt: publishSeed ? new Date() : null,
      });
      targetVersion = 1;
    } else {
      const latestPersistedVersion = await getLatestVersionNumber(survey._id);
      const resolvedCurrentVersion = Math.max(1, latestPersistedVersion);
      targetVersion = resolvedCurrentVersion;

      survey.description = mapped.description;
      survey.themeColor = mapped.themeColor;
      survey.thankYouMessage = mapped.thankYouMessage;
      survey.captureMetadata = mapped.captureMetadata;
      survey.currentVersion = resolvedCurrentVersion;
      survey.status = publishSeed ? 'published' : 'draft';
      survey.publishedVersion = publishSeed ? resolvedCurrentVersion : null;
      survey.publishedAt = publishSeed ? new Date() : null;
      await survey.save();
    }

    await SurveyVersion.findOneAndUpdate(
      { surveyId: survey._id, version: targetVersion },
      {
        surveyId: survey._id,
        companyId: user.companyId,
        createdBy: user._id,
        version: targetVersion,
        sections: mapped.sections,
        questions: mapped.questions,
        visibilityRules: mapped.visibilityRules,
        navigationRules: mapped.navigationRules,
        settings: mapped.settings,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // eslint-disable-next-line no-console
    console.log(
      `IEQ seeded successfully for company ${user.companyId} (survey: ${survey._id}, questions: ${mapped.questions.length}, status: ${survey.status}).`
    );
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`IEQ seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedIEQ();
