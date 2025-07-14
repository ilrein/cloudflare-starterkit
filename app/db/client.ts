import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// Type for database client that works with D1
export type DatabaseClient = ReturnType<typeof drizzle>;

/**
 * Create database client based on environment
 * - Development: Uses local D1 database via wrangler
 * - Production: Uses remote D1 database from Cloudflare Workers
 */
// Global variable to cache the database client
let databaseClientCache: DatabaseClient | null = null;

export function createDatabaseClient(env?: { DB?: D1Database }): DatabaseClient {
  // Return cached client if available
  if (databaseClientCache) {
    return databaseClientCache;
  }

  // Try to get DB from provided env, global env, or throw error
  const db = env?.DB || (global as any).__CF_ENV__?.DB;
  
  if (!db) {
    throw new Error('D1 database binding not available. Make sure to run with wrangler or provide env.DB');
  }

  // Both development and production use D1 database
  databaseClientCache = drizzle(db, { schema });
  return databaseClientCache;
}

/**
 * Get database client for current environment
 * This function can be used in both Remix loaders/actions and entry points
 */
export function getDatabase(env?: { DB?: D1Database }): DatabaseClient {
  return createDatabaseClient(env);
}