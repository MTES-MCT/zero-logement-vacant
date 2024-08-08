import { JestConfigWithTsJest } from 'ts-jest';

import baseConfig from './jest.config';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  roots: ['<rootDir>/src/infra/database'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  globalSetup: '<rootDir>/src/test/database-global-setup.ts'
};

export default config;
