import { PrismaNeon } from '@prisma/adapter-neon';
import { DATABASE_URL } from '$app/env/private';
import { PrismaClient } from './generated/prisma/client.ts';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Shared Prisma client over Neon's pooled serverless driver. */
export const db =
	globalForPrisma.prisma ??
	new PrismaClient({ adapter: new PrismaNeon({ connectionString: DATABASE_URL }) });

// Reuse one client across HMR reloads in dev.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
