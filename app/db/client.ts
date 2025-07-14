import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzleBetterSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Type for database client that works with both SQLite and D1
export type DatabaseClient = ReturnType<typeof drizzle> | ReturnType<typeof drizzleBetterSQLite>;

/**
 * Create database client based on environment
 * - Development: Uses better-sqlite3 with local SQLite file
 * - Production: Uses D1 database from Cloudflare Workers
 */
export function createDatabaseClient(env?: { DB?: D1Database }): DatabaseClient {
  // Check if we're in Cloudflare Workers environment with D1
  if (env?.DB) {
    // Production: Use D1 database
    return drizzle(env.DB, { schema });
  }

  // Development: Use local SQLite database
  // This path is used during Shopify CLI development
  const sqlite = new Database('./prisma/dev.sqlite');
  return drizzleBetterSQLite(sqlite, { schema });
}

/**
 * Get database client for current environment
 * This function can be used in both Remix loaders/actions and entry points
 */
export function getDatabase(env?: { DB?: D1Database }): DatabaseClient {
  return createDatabaseClient(env);
}