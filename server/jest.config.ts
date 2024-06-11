import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';

// eslint-disable-next-line import/no-commonjs
const tsconfig = require('./tsconfig.json');

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30_000,
  rootDir: '.',
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths),
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/infra/database',
  ],
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/src/test/setup-tests.ts',
  ],
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
};

export default config;
