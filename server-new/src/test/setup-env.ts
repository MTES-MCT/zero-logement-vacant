process.env.AUTH_SECRET = 'secret';
process.env.SYSTEM_ACCOUNT = `lovac-${new Date()
  .toISOString()
  .substring(0, 19)}@test.test`;
