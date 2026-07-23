/**
 * SurveyFlow Seeder - Create realistic test data
 *
 * @fileoverview Comprehensive seeder for survey application testing
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import colors from "colors";
import crypto from "crypto";

// Import mock data
import companiesData from "./data/companies.js";
import usersData from "./data/users.js";
import surveysData from "./data/surveys.js";
import surveyVersionsData from "./data/surveyVersions.js";
import recipientsData from "./data/recipients.js";
import responsesData from "./data/responses.js";
import seedSurveys from "./data/surveys.seed.js";
import seedSurveyVersions from "./data/surveyVersions.seed.js";
import seedRecipients from "./data/recipients.seed.js";
import seedResponses from "./data/responses.seed.js";

// Import models
import Company from "./models/company.models.js";
import User from "./models/user.models.js";
import Survey from "./models/survey.models.js";
import SurveyVersion from "./models/survey_version.models.js";
import Recipient from "./models/recipient.models.js";
import Response from "./models/response.models.js";
import connectDB from "./config/db.js";

dotenv.config();

/**
 * Import all survey application data
 */
const importData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for database connection...".yellow);
      await new Promise((resolve) => {
        mongoose.connection.once("connected", resolve);
      });
    }

    console.log("\n🧹 Clearing existing data...".yellow);

    // Clear all existing data in proper order (respecting foreign keys)
    await Response.deleteMany();
    await Recipient.deleteMany();
    await SurveyVersion.deleteMany();
    await Survey.deleteMany();
    await User.deleteMany();
    await Company.deleteMany();

    console.log("✅ Existing data cleared successfully".green);

    // Step 1: Create Companies
    console.log("🏢 Creating companies...".cyan);
    const createdCompanies = await Company.insertMany(companiesData);
    console.log(`✅ Created ${createdCompanies.length} companies`.green);

    // Step 2: Create Users with company relationships
    console.log("👥 Creating users...".cyan);
    const createdUsers = [];

    for (let index = 0; index < usersData.length; index++) {
      const user = usersData[index];
      const companyIndex = Math.floor(
        index / (usersData.length / createdCompanies.length)
      );
      const userData = {
        ...user,
        companyId:
          createdCompanies[Math.min(companyIndex, createdCompanies.length - 1)]
            ._id,
      };

      // Create user individually to trigger pre-save hooks
      const newUser = new User(userData);
      const savedUser = await newUser.save();
      createdUsers.push(savedUser);
    }

    console.log(`✅ Created ${createdUsers.length} users`.green);

    // Step 3: Create Surveys with proper company and user relationships
    console.log("📋 Creating surveys...".cyan);
    const allSurveys = [...surveysData, ...seedSurveys];
    const surveysWithRelations = allSurveys.map((survey, index) => {
      // Assign all seed surveys to first company (TechFlow) for easy testing
      let companyIndex;
      if (index >= surveysData.length) {
        // This is a seed survey - assign to first company
        companyIndex = 0;
      } else {
        // Old survey - distribute across companies
        companyIndex = Math.floor(
          index / Math.ceil(surveysData.length / createdCompanies.length)
        );
      }

      const company =
        createdCompanies[Math.min(companyIndex, createdCompanies.length - 1)];
      const companyUsers = createdUsers.filter(
        (user) => user.companyId.toString() === company._id.toString()
      );
      const adminUsers = companyUsers.filter((user) => user.role === "admin");
      const createdBy =
        adminUsers.length > 0 ? adminUsers[0]._id : companyUsers[0]._id;

      return {
        ...survey,
        companyId: company._id,
        createdBy: createdBy,
      };
    });

    const createdSurveys = await Survey.insertMany(surveysWithRelations);
    console.log(`✅ Created ${createdSurveys.length} surveys`.green);

    // Step 4: Create Survey Versions with proper survey relationships
    console.log("📝 Creating survey versions...".cyan);
    const versionsWithRelations = [];

    const allVersions = [...surveyVersionsData, ...seedSurveyVersions];
    for (const versionData of allVersions) {
      const survey = createdSurveys.find(
        (s) => s.title === versionData.surveyTitle
      );
      if (survey) {
        versionsWithRelations.push({
          surveyId: survey._id,
          companyId: survey.companyId,
          version: versionData.version,
          sections: versionData.sections || [],
          questions: versionData.questions || [],
          visibilityRules: versionData.visibilityRules || [],
          navigationRules: versionData.navigationRules || [],
          settings: versionData.settings || {},
          createdBy: survey.createdBy,
        });
      }
    }

    const createdVersions = [];
    for (const version of versionsWithRelations) {
      const createdVersion = await SurveyVersion.create(version);
      createdVersions.push(createdVersion);
    }
    console.log(`✅ Created ${createdVersions.length} survey versions`.green);

    // Step 5: Create Recipients with proper survey relationships
    console.log("📧 Creating recipients...".cyan);
    const recipientsWithRelations = [];

    const allRecipients = [...recipientsData, ...seedRecipients];
    for (const recipientGroup of allRecipients) {
      const survey = createdSurveys.find(
        (s) => s.title === recipientGroup.surveyTitle
      );
      if (survey) {
        const companyUsers = createdUsers.filter(
          (user) => user.companyId.toString() === survey.companyId.toString()
        );
        const adminUser =
          companyUsers.find((user) => user.role === "admin") || companyUsers[0];

        for (const recipient of recipientGroup.recipients) {
          recipientsWithRelations.push({
            ...recipient,
            surveyId: survey._id,
            companyId: survey.companyId,
            createdBy: adminUser._id,
          });
        }
      }
    }

    const createdRecipients = await Recipient.insertMany(
      recipientsWithRelations
    );
    console.log(`✅ Created ${createdRecipients.length} recipients`.green);

    // Step 6: Create Responses with proper answer mapping
    console.log("💬 Creating responses...".cyan);
    const responsesWithRelations = [];

    const allResponses = [...responsesData, ...seedResponses];
    for (const responseGroup of allResponses) {
      const survey = createdSurveys.find(
        (s) => s.title === responseGroup.surveyTitle
      );
      const surveyVersion = createdVersions.find(
        (v) => v.surveyId.toString() === survey._id.toString()
      );

      if (survey && surveyVersion) {
        for (const response of responseGroup.responses) {
          const recipient = createdRecipients.find(
            (r) =>
              r.surveyId.toString() === survey._id.toString() &&
              r.name === response.recipientName
          );

          // Create answers Map by mapping template answers to actual question IDs
          const answersMap = new Map();
          const questions = surveyVersion.questions;

          // Map template answers to actual question IDs based on question types
          questions.forEach((question) => {
            let answerValue = null;

            // Map answers based on question type and content
            if (
              question.type === "short_text" &&
              question.title.toLowerCase().includes("title")
            ) {
              answerValue =
                response.answerTemplate["job-title"] ||
                response.answerTemplate["company-name"];
            } else if (
              question.type === "dropdown" &&
              question.title.toLowerCase().includes("department")
            ) {
              answerValue = response.answerTemplate["department"];
            } else if (
              question.type === "dropdown" &&
              question.title.toLowerCase().includes("age")
            ) {
              answerValue = response.answerTemplate["age-group"];
            } else if (
              question.type === "dropdown" &&
              question.title.toLowerCase().includes("visit")
            ) {
              answerValue = response.answerTemplate["visit-type"];
            } else if (question.type === "rating") {
              if (question.title.toLowerCase().includes("satisfaction")) {
                answerValue =
                  response.answerTemplate["satisfaction-rating"] ||
                  response.answerTemplate["maintenance-satisfaction"];
              } else if (question.title.toLowerCase().includes("quality")) {
                answerValue = response.answerTemplate["service-quality"];
              } else if (question.title.toLowerCase().includes("courtesy")) {
                answerValue = response.answerTemplate["staff-courtesy"];
              } else if (
                question.title.toLowerCase().includes("communication")
              ) {
                answerValue = response.answerTemplate["provider-communication"];
              }
            } else if (question.type === "single_choice") {
              if (question.title.toLowerCase().includes("recommend")) {
                answerValue =
                  response.answerTemplate["recommend-company"] ||
                  response.answerTemplate["recommend-likelihood"] ||
                  response.answerTemplate["recommend-facility"];
              }
            } else if (question.type === "multiple_choice") {
              if (question.title.toLowerCase().includes("improvement")) {
                answerValue = response.answerTemplate["improvement-areas"];
              } else if (question.title.toLowerCase().includes("exceeded")) {
                answerValue = response.answerTemplate["exceeded-expectations"];
              } else if (question.title.toLowerCase().includes("spaces")) {
                answerValue = response.answerTemplate["used-spaces"];
              }
            } else if (question.type === "long_text") {
              answerValue =
                response.answerTemplate["suggestions"] ||
                response.answerTemplate["additional-comments"] ||
                response.answerTemplate["improvements"];
            } else if (question.type === "date") {
              answerValue =
                response.answerTemplate["join-date"] ||
                response.answerTemplate["visit-date"];
            }

            if (
              (answerValue === null || answerValue === undefined) &&
              response.answerTemplate
            ) {
              // Fallback: allow direct questionId mapping from answerTemplate
              answerValue = response.answerTemplate[question.id];
            }

            if (answerValue !== null && answerValue !== undefined) {
              answersMap.set(question.id, answerValue);
            }
          });

          // Generate respondent identifier hash for whitelisted surveys
          let respondentIdentifier = null;
          if (survey.isWhitelistEnabled && recipient) {
            const identifier = recipient.email || recipient.phone;
            respondentIdentifier = crypto
              .createHash("sha256")
              .update(identifier)
              .digest("hex");
          } else if (!survey.isWhitelistEnabled) {
            // Generate unique identifier for non-whitelisted (open) responses
            // This prevents duplicate key errors on the sparse unique index
            respondentIdentifier = crypto.randomUUID();
          }

          responsesWithRelations.push({
            surveyId: survey._id,
            surveyVersion: surveyVersion.version,
            companyId: survey.companyId,
            recipientId: recipient ? recipient._id : null,
            respondentIdentifier,
            recipientName: response.recipientName,
            recipientPhone: response.recipientPhone,
            recipientEmail: response.recipientEmail,
            answers: answersMap,
            submittedAt: response.submittedAt,
            completionTime: response.completionTime,
            device: response.device,
          });
        }
      }
    }

    const createdResponses = await Response.insertMany(responsesWithRelations);
    console.log(`✅ Created ${createdResponses.length} responses`.green);

    // Final summary
    console.log("\n🎉 SurveyFlow Data Import Complete!".green.inverse);
    console.log(
      `
📊 Summary:
   Companies: ${createdCompanies.length}
   Users: ${createdUsers.length}
   Surveys: ${createdSurveys.length}
   Survey Versions: ${createdVersions.length}
   Recipients: ${createdRecipients.length}
   Responses: ${createdResponses.length}

🔐 Test Login Credentials:
   Admin: admin@techflow.com / password123
   Viewer: viewer@techflow.com / password123

   Admin: admin@greenleaf.com / password123
   Viewer: viewer@greenleaf.com / password123

   Admin: admin@urbandesign.com / password123
   Designer: designer@urbandesign.com / password123

   Admin: admin@healthcare.com / password123
   Nurse: nurse@healthcare.com / password123
`.cyan
    );

    process.exit(0);
  } catch (error) {
    console.error(`❌ Import Error: ${error.message}`.red.inverse);
    console.error(error.stack);
    process.exit(1);
  }
};

/**
 * Destroy all survey application data
 */
const destroyData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for database connection...".yellow);
      await new Promise((resolve) => {
        mongoose.connection.once("connected", resolve);
      });
    }

    console.log("\n🧹 Destroying all survey application data...".yellow);

    await Response.deleteMany();
    await Recipient.deleteMany();
    await SurveyVersion.deleteMany();
    await Survey.deleteMany();
    await User.deleteMany();
    await Company.deleteMany();

    console.log("✅ All survey application data destroyed!".red.inverse);
    console.log(
      `
🗑️ Deleted:
   - All responses
   - All recipients
   - All survey versions
   - All surveys
   - All users
   - All companies
`.yellow
    );

    process.exit(0);
  } catch (error) {
    console.error(`❌ Destroy Error: ${error.message}`.red.inverse);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run seeder based on command line arguments
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
