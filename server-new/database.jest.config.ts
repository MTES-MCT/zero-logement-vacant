import { JestConfigWithTsJest } from 'ts-jest';

import baseConfig from './jest.config';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  roots: ['<rootDir>/src/infra/database'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
};

export default config;
