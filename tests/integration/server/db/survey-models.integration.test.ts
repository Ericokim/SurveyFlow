// @vitest-environment node
//
// Server code must run under the node environment — see the note in
// tenant-scope.integration.test.ts.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorkspaceWithOwner } from "@/features/workspace/create-workspace";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "@/server/db/mongoose";
import { withTenantContext } from "@/server/db/tenant-context";
import { MissingTenantContextError } from "@/server/db/tenant-scope.plugin";
import { AuditLog } from "@/server/models/audit-log.model";
import { Company } from "@/server/models/company.model";
import { Membership } from "@/server/models/membership.model";
import { Recipient } from "@/server/models/recipient.model";
import { SurveyResponse } from "@/server/models/response.model";
import { Survey } from "@/server/models/survey.model";
import { SurveyVersion } from "@/server/models/survey-version.model";
import { User } from "@/server/models/user.model";

const hasDatabase = Boolean(process.env.MONGODB_URI);
const RUN_ID = `sv-${Math.floor(Number(process.hrtime.bigint() % 1_000_000n))}`;

describe.skipIf(!hasDatabase)("survey models (integration)", () => {
  const companyIds: mongoose.Types.ObjectId[] = [];
  let ownerId: mongoose.Types.ObjectId;
  let companyId: string;
  let otherCompanyId: string;
  let surveyId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectToDatabase();

    const owner = await User.create({
      name: "Survey Owner",
      email: `${RUN_ID}@example.test`,
      passwordHash: "x".repeat(60),
    });
    ownerId = owner._id;

    const mine = await createWorkspaceWithOwner({
      ownerId,
      workspaceName: `${RUN_ID} Mine`,
    });
    const theirs = await createWorkspaceWithOwner({
      ownerId,
      workspaceName: `${RUN_ID} Theirs`,
    });

    companyIds.push(mine.companyId, theirs.companyId);
    companyId = String(mine.companyId);
    otherCompanyId = String(theirs.companyId);

    const survey = await withTenantContext(companyId, () =>
      Survey.create({
        companyId: mine.companyId,
        title: "Patient Intake",
        publicId: `${RUN_ID}-intake`,
        createdBy: ownerId,
      }),
    );
    surveyId = survey._id;
  }, 60_000);

  afterAll(async () => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) return;

    const bypass = { bypassTenantScope: true };
    const scope = { companyId: { $in: companyIds } };

    await SurveyResponse.deleteMany(scope).setOptions(bypass);
    await Recipient.deleteMany(scope).setOptions(bypass);
    await SurveyVersion.deleteMany(scope).setOptions(bypass);
    await Survey.deleteMany(scope).setOptions(bypass);
    await AuditLog.deleteMany(scope).setOptions(bypass);
    await Membership.deleteMany(scope);
    await Company.deleteMany({ _id: { $in: companyIds } });
    await User.deleteOne({ _id: ownerId });

    await disconnectFromDatabase();
  }, 60_000);

  it("creates a survey with sane defaults", async () => {
    const survey = await withTenantContext(companyId, () =>
      Survey.findById(surveyId).lean(),
    );

    expect(survey?.status).toBe("draft");
    expect(survey?.access).toBe("open");
    expect(survey?.currentVersion).toBe(1);
    expect(survey?.publishedVersion).toBeNull();
    expect(survey?.responseCount).toBe(0);
  });

  it("stores sections, typed questions and rules on a version", async () => {
    const created = await withTenantContext(companyId, () =>
      SurveyVersion.create({
        companyId,
        surveyId,
        version: 1,
        sections: [{ id: "s1", title: "About you", questionIds: ["q1", "q2"] }],
        questions: [
          {
            id: "q1",
            type: "single_choice",
            title: "Age band",
            options: ["18-29", "30-44"],
            allowOther: true,
          },
          {
            id: "q2",
            type: "long_text",
            title: "Anything else?",
            validation: { maxLength: 500 },
          },
        ],
        visibilityRules: [
          {
            id: "v1",
            targetType: "question",
            targetId: "q2",
            effect: "show",
            when: {
              match: "all",
              conditions: [
                { questionId: "q1", operator: "equals", value: "18-29" },
              ],
            },
          },
        ],
        navigationRules: [
          {
            id: "n1",
            when: {
              match: "any",
              conditions: [{ questionId: "q1", operator: "exists" }],
            },
            action: { type: "jump", targetSectionId: "s1" },
          },
        ],
      }),
    );

    expect(created.sections).toHaveLength(1);
    expect(created.questions).toHaveLength(2);
    expect(created.visibilityRules).toHaveLength(1);
    expect(created.navigationRules).toHaveLength(1);
  });

  it("rejects a question type outside the vocabulary", async () => {
    await expect(
      withTenantContext(companyId, () =>
        SurveyVersion.create({
          companyId,
          surveyId,
          version: 99,
          questions: [{ id: "bad", type: "telepathy", title: "?" }],
        }),
      ),
    ).rejects.toThrow(/validation failed/i);
  });

  it("refuses two versions with the same number for one survey", async () => {
    await expect(
      withTenantContext(companyId, () =>
        SurveyVersion.create({ companyId, surveyId, version: 1 }),
      ),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("stamps the answered version on a response", async () => {
    const response = await withTenantContext(companyId, () =>
      SurveyResponse.create({
        companyId,
        surveyId,
        surveyVersion: 1,
        answers: new Map([["q1", "18-29"]]),
        responseStatus: "completed",
      }),
    );

    expect(response.surveyVersion).toBe(1);
    expect(response.answers.get("q1")).toBe("18-29");
  });

  it("keeps surveys invisible to another workspace", async () => {
    const seen = await withTenantContext(otherCompanyId, () =>
      Survey.find({}).lean(),
    );

    expect(seen).toHaveLength(0);
  });

  it("fails closed on every new model without a workspace", async () => {
    await expect(Survey.find({}).lean()).rejects.toThrow(
      MissingTenantContextError,
    );
    await expect(SurveyVersion.find({}).lean()).rejects.toThrow(
      MissingTenantContextError,
    );
    await expect(SurveyResponse.find({}).lean()).rejects.toThrow(
      MissingTenantContextError,
    );
    await expect(Recipient.find({}).lean()).rejects.toThrow(
      MissingTenantContextError,
    );
  });

  it("hides soft-deleted surveys but keeps them retrievable", async () => {
    const doomed = await withTenantContext(companyId, () =>
      Survey.create({
        companyId,
        title: "Temporary",
        publicId: `${RUN_ID}-temp`,
        createdBy: ownerId,
      }),
    );

    await withTenantContext(companyId, () =>
      Survey.updateOne({ _id: doomed._id }, { deletedAt: new Date() }),
    );

    const visible = await withTenantContext(companyId, () =>
      Survey.findById(doomed._id).lean(),
    );
    expect(visible).toBeNull();

    const includingDeleted = await withTenantContext(companyId, () =>
      Survey.findOne({ _id: doomed._id, deletedAt: { $ne: null } }).lean(),
    );
    expect(includingDeleted?.title).toBe("Temporary");
  });
});
