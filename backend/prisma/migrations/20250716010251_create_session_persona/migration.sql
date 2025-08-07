/*
  Warnings:

  - Made the column `age_group` on table `Persona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `Persona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `goal` on table `Persona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tech` on table `Persona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `usage` on table `Persona` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gender" TEXT NOT NULL,
    "age_group" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "tech" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "type" TEXT NOT NULL
);
INSERT INTO "new_Persona" ("age_group", "gender", "goal", "id", "personality", "tech", "type", "usage") SELECT "age_group", "gender", "goal", "id", "personality", "tech", "type", "usage" FROM "Persona";
DROP TABLE "Persona";
ALTER TABLE "new_Persona" RENAME TO "Persona";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
