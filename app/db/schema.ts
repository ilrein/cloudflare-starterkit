import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Session table for storing Shopify OAuth session data
 * Compatible with Shopify's session storage requirements
 */
export const sessions = sqliteTable('Session', {
  id: text('id').primaryKey(),
  shop: text('shop').notNull(),
  state: text('state').notNull(),
  isOnline: integer('isOnline', { mode: 'boolean' }).default(false).notNull(),
  scope: text('scope'),
  expires: text('expires'), // ISO string representation of DateTime
  accessToken: text('accessToken').notNull(),
  userId: integer('userId'), // BigInt as integer for SQLite compatibility
  firstName: text('firstName'),
  lastName: text('lastName'),
  email: text('email'),
  accountOwner: integer('accountOwner', { mode: 'boolean' }).default(false).notNull(),
  locale: text('locale'),
  collaborator: integer('collaborator', { mode: 'boolean' }).default(false),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;