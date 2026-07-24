import { kysely } from '~/infra/database/kysely';
import {
  getKyselyTransaction,
  runWithinKyselyTransaction,
  withinKyselyTransaction
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

describe('withinKyselyTransaction', () => {
  it('registers the transaction it opens as ambient, so a nested call joins it instead of opening a second one', async () => {
    let outer: unknown;
    let inner: unknown;

    await withinKyselyTransaction(async (trx) => {
      outer = trx;
      await withinKyselyTransaction(async (nestedTrx) => {
        inner = nestedTrx;
      });
    });

    expect(inner).toBe(outer);
  });
});
