// Set NODE_ENV to test before loading modules
process.env.NODE_ENV = "test";

// Set test DATABASE_URL before dotenv loads .env (which may contain a SQLite URL).
// The Prisma schema uses PostgreSQL, so tests must connect to PostgreSQL.
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = "postgresql://paperclip:paperclip@localhost:54329/drinkux_test";
}

// Load remaining environment variables from .env (won't override DATABASE_URL)
require('dotenv').config();
