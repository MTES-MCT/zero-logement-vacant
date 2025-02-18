import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';

// eslint-disable-next-line import/no-commonjs
const tsconfig = require('./tsconfig.json');

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  // These files are used if `jest --coverage` is run
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/infra/database/**',
    '<rootDir>/src/infra/database/test/*.test.ts',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/types'
  ],
  testEnvironment: 'node',
  testTimeout: 30_000,
  forceExit: true,
  rootDir: '.',
  roots: ['<rootDir>'],
  modulePaths: [tsconfig.compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths),
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/infra/database'
  ],
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/src/test/setup-tests.ts'
  ],
  globalSetup: '<rootDir>/src/test/global-setup.ts'
};

export default config;
