/*
  Warnings:

  - Made the column `name` on table `ClientCompany` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "ClientTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "logoUrl" TEXT,
    "backgroundUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "ClientTheme_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "POSIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "POSIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pointOfContact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ClientCompany" ("createdAt", "id", "name", "pointOfContact", "updatedAt") SELECT "createdAt", "id", "name", "pointOfContact", "updatedAt" FROM "ClientCompany";
DROP TABLE "ClientCompany";
ALTER TABLE "new_ClientCompany" RENAME TO "ClientCompany";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientTheme_companyId_key" ON "ClientTheme"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "POSIntegration_companyId_key" ON "POSIntegration"("companyId");
