import mongoose from "mongoose";

import { env } from "@/env";

/**
 * Netlify Functions cold-start per invocation and Vite re-evaluates modules on
 * every HMR update. Without a cache on `globalThis`, each of those would open a
 * fresh connection pool and exhaust the database's connection limit.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __surveyflowMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__surveyflowMongoose ?? {
  conn: null,
  promise: null,
};

globalThis.__surveyflowMongoose = cache;

/**
 * Connect to MongoDB, reusing the cached connection when one already exists.
 *
 * Every server function that touches the database must await this first.
 * It throws — loudly — when `MONGODB_URI` is absent, rather than failing at
 * import time, so the app still starts locally without a database.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (see .env.example) before using any feature that reads or writes data.",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      // Fail fast instead of silently queueing operations when the pool is down.
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Clear the rejected promise so the next call retries rather than
    // replaying the same failure forever.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/** Test helper — drops the cached connection so a suite can reconnect cleanly. */
export async function disconnectFromDatabase(): Promise<void> {
  if (cache.conn) await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
