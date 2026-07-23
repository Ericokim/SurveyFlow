import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Recipient from '../models/recipient.models.js';
import { logger } from '../utils/logger.js';

dotenv.config({ quiet: true });

const normalizeOptionalContactFields = async () => {
  const updates = await Promise.all([
    Recipient.updateMany({ phone: null }, { $unset: { phone: '' } }),
    Recipient.updateMany({ email: null }, { $unset: { email: '' } }),
    Recipient.updateMany({ phone: '' }, { $unset: { phone: '' } }),
    Recipient.updateMany({ email: '' }, { $unset: { email: '' } }),
  ]);

  const modifiedCount = updates.reduce(
    (total, result) => total + (result.modifiedCount || 0),
    0
  );

  logger.info(`Normalized optional recipient contact fields on ${modifiedCount} document(s)`);
};

const recreateRecipientIndexes = async () => {
  const indexNames = new Set(
    (await Recipient.collection.indexes()).map((index) => index.name)
  );

  for (const indexName of ['surveyId_1_phone_1', 'surveyId_1_email_1']) {
    if (indexNames.has(indexName)) {
      await Recipient.collection.dropIndex(indexName);
      logger.info(`Dropped index ${indexName}`);
    }
  }

  await Recipient.collection.createIndex(
    { surveyId: 1, phone: 1 },
    {
      name: 'surveyId_1_phone_1',
      unique: true,
      partialFilterExpression: {
        phone: { $type: 'string' },
      },
    }
  );

  await Recipient.collection.createIndex(
    { surveyId: 1, email: 1 },
    {
      name: 'surveyId_1_email_1',
      unique: true,
      partialFilterExpression: {
        email: { $type: 'string' },
      },
    }
  );

  logger.info('Recreated recipient unique indexes with partial filters');
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 12000,
    });

    logger.info('Connected to MongoDB');
    await normalizeOptionalContactFields();
    await recreateRecipientIndexes();
    logger.info('Recipient index repair completed successfully');
  } catch (error) {
    logger.error('Recipient index repair failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
