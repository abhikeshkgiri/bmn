/**
 * Load environment variables for any Node process that touches the database directly.
 * Next.js also loads .env.local automatically, but scripts and direct connections need it too.
 * We avoid a static `dotenv/config` import here because Next.js bundles this module for the browser
 * and resolves the package incorrectly in the app runtime.
 */
import path from 'node:path';

if (typeof window === 'undefined') {
  try {
    require('dotenv').config({
      path: path.resolve(process.cwd(), '.env.local'),
    });
  } catch {
    // Ignore dotenv loading failures in environments where it is unavailable.
  }
}

/**
 * Configure DNS for MongoDB SRV resolution (must be first)
 */
import "./dns-config";

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

interface GlobalWithMongoose {
  mongoose: CachedConnection;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during development
 */
let cached: CachedConnection = (global as unknown as GlobalWithMongoose)
  .mongoose;

if (!cached) {
  (global as unknown as GlobalWithMongoose).mongoose = {
    conn: null,
    promise: null,
  };
  cached = (global as unknown as GlobalWithMongoose).mongoose;
}

/**
 * Connect to MongoDB using Mongoose
 * Reuses connection during development to avoid connection pooling issues
 * 
 * DNS configuration for MongoDB SRV resolution is handled in dns-config.ts
 * which is imported before this module is loaded.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error("Failed to connect to MongoDB:", error instanceof Error ? error.name : "UnknownError");
    throw error;
  }
}

export default connectDB;
