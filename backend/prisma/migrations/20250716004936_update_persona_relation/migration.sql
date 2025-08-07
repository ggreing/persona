-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "personaId" TEXT NOT NULL,
    CONSTRAINT "Session_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "age_group" TEXT,
    "gender" TEXT,
    "goal" TEXT,
    "usage" TEXT,
    "tech" TEXT
);
INSERT INTO "new_Persona" ("age_group", "gender", "goal", "id", "personality", "tech", "type", "usage") SELECT "age_group", "gender", "goal", "id", "personality", "tech", "type", "usage" FROM "Persona";
DROP TABLE "Persona";
ALTER TABLE "new_Persona" RENAME TO "Persona";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
