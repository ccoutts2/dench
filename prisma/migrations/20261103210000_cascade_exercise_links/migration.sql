-- DropForeignKey
ALTER TABLE "template_exercise" DROP CONSTRAINT "template_exercise_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "workout_exercise" DROP CONSTRAINT "workout_exercise_exerciseId_fkey";

-- AddForeignKey
ALTER TABLE "template_exercise" ADD CONSTRAINT "template_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
