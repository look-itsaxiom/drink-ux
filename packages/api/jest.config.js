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
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@drink-ux/shared$": "<rootDir>/../shared/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: false,
      tsconfig: {
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
