// jest.config.cjs
const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('./craco.config.js');

module.exports = {
  ...createJestConfig(cracoConfig),

  testEnvironment: 'node',

  /** Transpile TypeScript / JSX en CommonJS ou ESM selon ton besoin */
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { useESM: false }],
  },

  /** ⬇︎ Dit à Jest de NE PAS ignorer tough-cookie */
  transformIgnorePatterns: [
    '/node_modules/(?!(@bundled-es-modules-tough-cookie)/)',
  ],
};
