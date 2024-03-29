module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/scripts', '<rootDir>/server', '<rootDir>/shared'],
  setupFiles: ['<rootDir>/server/test/setupEnv.ts'],
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/server/test/setupTests.ts',
  ],
  globalSetup: '<rootDir>/server/test/global-setup.ts',
  globalTeardown: '<rootDir>/server/test/global-teardown.ts',
};
