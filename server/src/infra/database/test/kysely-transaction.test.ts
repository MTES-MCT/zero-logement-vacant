import { kysely } from '~/infra/database/kysely';
import {
  getKyselyTransaction,
  runWithinKyselyTransaction
} from '~/infra/database/kysely-transaction';

describe('runWithinKyselyTransaction', () => {
  it('exposes the supplied transaction via getKyselyTransaction', async () => {
    const seen = await kysely
      .transaction()
      .execute((trx) =>
        runWithinKyselyTransaction(trx, async () => getKyselyTransaction())
      );

    expect(seen).toBeDefined();
  });

  it('restores no ambient transaction after the callback', async () => {
    await kysely
      .transaction()
      .execute((trx) => runWithinKyselyTransaction(trx, async () => undefined));

    expect(getKyselyTransaction()).toBeUndefined();
  });
});
