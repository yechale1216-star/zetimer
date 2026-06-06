-- AlterTable
ALTER TABLE "StudentPromotion" ADD COLUMN     "fromStreamId" TEXT,
ADD COLUMN     "toStreamId" TEXT;

-- CreateIndex
CREATE INDEX "StudentPromotion_fromGradeId_idx" ON "StudentPromotion"("fromGradeId");

-- CreateIndex
CREATE INDEX "StudentPromotion_toGradeId_idx" ON "StudentPromotion"("toGradeId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_streamId_idx" ON "TeacherAssignment"("streamId");

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_fromGradeId_fkey" FOREIGN KEY ("fromGradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_fromSectionId_fkey" FOREIGN KEY ("fromSectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_toGradeId_fkey" FOREIGN KEY ("toGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_toSectionId_fkey" FOREIGN KEY ("toSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_fromStreamId_fkey" FOREIGN KEY ("fromStreamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_toStreamId_fkey" FOREIGN KEY ("toStreamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;
