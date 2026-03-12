// Set NODE_ENV to test before loading modules
process.env.NODE_ENV = "test";

// Load environment variables from .env
// dotenv doesn't override existing env vars by default
require('dotenv').config();

// Use DATABASE_URL from environment if provided, otherwise fall back to local test database
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://paperclip:paperclip@localhost:54329/drinkux_test";
}
