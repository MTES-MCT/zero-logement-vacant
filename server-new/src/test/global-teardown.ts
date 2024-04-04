import db from '~/infra/database';

export default async function teardown() {
  try {
    await db.migrate.rollback(undefined, true);
    console.log('Rolled back.');
  } finally {
    await db.destroy();
  }
}
