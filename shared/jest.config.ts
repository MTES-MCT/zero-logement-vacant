import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30_000,
  rootDir: '.',
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/src/test/setup-tests.ts'
  ],
};

export default config;
