module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './server',
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts'
}
