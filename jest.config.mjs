import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/components/**/*.{ts,tsx}",
    "src/contexts/**/*.{ts,tsx}",
    "src/lib/**/*.{ts,tsx}",
    "src/services/**/*.{ts,tsx}",
    "src/utils/**/*.{ts,tsx}",
    "src/app/api/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/types/**",
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

export default createJestConfig(customJestConfig);
