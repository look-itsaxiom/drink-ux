-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pointOfContact" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
