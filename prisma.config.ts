import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrations need a direct (unpooled) connection; the app uses the pooled one.
// The Vercel ⇄ Neon integration provides both variables.
export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx prisma/seed.ts'
	},
	datasource: {
		url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? ''
	}
});
