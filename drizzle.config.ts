import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './app/db/migrations',
  dialect: 'sqlite',
  
  // Development database (local SQLite)
  dbCredentials: {
    url: './prisma/dev.sqlite'
  },

  // Verbose logging for development
  verbose: true,
  strict: true,
});