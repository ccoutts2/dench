/**
 * Seeds the global exercise library. Idempotent: existing rows (matched by
 * their deterministic id) are left alone, so it is safe to run on every deploy.
 *
 *   npx prisma db seed
 */
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/lib/server/generated/prisma/client.ts';
import { buildExercises } from './exercises.ts';

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
	const exercises = buildExercises();
	const { count } = await prisma.exercise.createMany({
		data: exercises.map((e) => ({ ...e, userId: null })),
		skipDuplicates: true
	});
	console.log(`Exercise library: ${exercises.length} defined, ${count} inserted.`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
