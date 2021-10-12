module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './server',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts']
}
