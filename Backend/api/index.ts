/**
 * Serverless entry point for Vercel.
 *
 * Vercel runs each request in a function that may be a cold start or a warm
 * reuse of a previous one. Two things matter because of that:
 *
 *  1. The Mongoose connection is cached on `globalThis`, so a warm invocation
 *     reuses the existing socket instead of opening a new one. Without this,
 *     a busy deployment exhausts the database's connection limit within
 *     minutes.
 *  2. Nothing calls `app.listen()`. Vercel owns the HTTP server; we only
 *     export the Express handler.
 *
 * `npm start` (Backend/Server.js) is still the entry point for a long-running
 * host such as Render, Railway or a plain VM.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import app from '../Server';
import config from '../config/env';
import { ensureDemoPlatformAdmin } from '../seed/demoAccounts';

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // `var` is required for a property on globalThis.
  // eslint-disable-next-line no-var
  var __careeaseMongoose: MongooseCache | undefined;
}

// `globalThis` survives warm invocations; a module-level variable does not
// reliably, because the module registry can be reset between deployments.
const cache = globalThis.__careeaseMongoose || (globalThis.__careeaseMongoose = {
  connection: null,
  promise: null
});

const connect = async (): Promise<typeof mongoose> => {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(config.mongoUri, {
        // Fail fast rather than hold the function open until Vercel times out.
        serverSelectionTimeoutMS: 8000,
        // A serverless container handles one request at a time, so a large
        // pool per container just multiplies connections against the cluster.
        maxPoolSize: 5,
        minPoolSize: 0
      })
      .then(async (instance) => {
        console.log('[db] serverless connection established');
        if (config.demoMode) {
          await ensureDemoPlatformAdmin().catch((error: Error) =>
            console.error('[db] demo platform admin:', error.message)
          );
        }
        return instance;
      })
      .catch((error) => {
        // Clear the cached promise so the next request retries instead of
        // resolving the same rejection forever.
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
};

export default async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  try {
    await connect();
  } catch (error) {
    console.error('[db] could not connect:', (error as Error).message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'The database is unavailable',
        message:
          'The API could not reach MongoDB. Check that MONGO_URI is set on this deployment and that the database allows connections from Vercel.'
      })
    );
    return;
  }

  app(req, res);
};
