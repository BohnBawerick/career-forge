import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  // Only the tables career-forge owns. GoTrue's `auth` schema is read, never generated.
  schema: './db/schema.ts',
  out: './db/migrations',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
})
