module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/setupTests.ts'],
};
