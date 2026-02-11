// Set NODE_ENV to test before loading modules
process.env.NODE_ENV = "test";

// Load environment variables from .env
// dotenv doesn't override existing env vars by default
require('dotenv').config();

// Override DATABASE_URL for tests to use isolated test database
process.env.DATABASE_URL = "file:./test.db";
