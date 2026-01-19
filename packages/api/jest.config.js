module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/__tests__/**", "!src/**/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@drink-ux/shared/types$": "<rootDir>/../shared/src/types.ts",
    "^@drink-ux/shared$": "<rootDir>/../shared/src/types.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  // Run tests serially to avoid database isolation issues
  // Each test file needs exclusive database access
  maxWorkers: 1,
  globals: {
    "ts-jest": {
      useESM: false,
      tsconfig: {
        allowSyntheticDefaultImports: true,
      },
    },
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
};
