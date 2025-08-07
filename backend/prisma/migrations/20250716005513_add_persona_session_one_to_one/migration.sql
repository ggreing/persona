/*
  Warnings:

  - A unique constraint covering the columns `[personaId]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Session_personaId_key" ON "Session"("personaId");
