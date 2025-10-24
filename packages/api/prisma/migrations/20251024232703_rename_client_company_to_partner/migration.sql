/*
  Warnings:

  - You are about to drop the `ClientCompany` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientTheme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `companyId` on the `POSIntegration` table. All the data in the column will be lost.
  - Added the required column `partnerId` to the `POSIntegration` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ClientTheme_companyId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClientCompany";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClientTheme";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pointOfContact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PartnerTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "logoUrl" TEXT,
    "backgroundUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "partnerId" TEXT NOT NULL,
    CONSTRAINT "PartnerTheme_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_POSIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "partnerId" TEXT NOT NULL,
    CONSTRAINT "POSIntegration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_POSIntegration" ("createdAt", "id", "isActive", "provider", "updatedAt") SELECT "createdAt", "id", "isActive", "provider", "updatedAt" FROM "POSIntegration";
DROP TABLE "POSIntegration";
ALTER TABLE "new_POSIntegration" RENAME TO "POSIntegration";
CREATE UNIQUE INDEX "POSIntegration_partnerId_key" ON "POSIntegration"("partnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PartnerTheme_partnerId_key" ON "PartnerTheme"("partnerId");
