import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const dbDestroy = vi.fn().mockResolvedValue(undefined);
  const kyselyDestroy = vi.fn().mockResolvedValue(undefined);
  const flipSentCampaignHousings = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() };
  return { dbDestroy, kyselyDestroy, flipSentCampaignHousings, logger };
});

vi.mock('~/infra/config', () => ({
  default: { app: { isReviewApp: false } }
}));
vi.mock('~/infra/database', () => ({
  default: { destroy: mocks.dbDestroy }
}));
vi.mock('~/infra/database/kysely', () => ({
  kysely: { destroy: mocks.kyselyDestroy }
}));
vi.mock('~/infra/logger', () => ({
  createLogger: () => mocks.logger
}));
vi.mock('../task', () => ({
  flipSentCampaignHousings: mocks.flipSentCampaignHousings
}));

import { main } from '../index';

describe('flip-sent-campaign-housings entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('logs the failure and sets a non-zero exit code instead of letting it become an unhandled rejection', async () => {
    mocks.flipSentCampaignHousings.mockRejectedValue(new Error('boom'));

    await main();

    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(process.exitCode).toBe(1);
  });

  it('destroys both the Knex and the Kysely connection pools when the run fails', async () => {
    mocks.flipSentCampaignHousings.mockRejectedValue(new Error('boom'));

    await main();

    expect(mocks.dbDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.kyselyDestroy).toHaveBeenCalledTimes(1);
  });

  it('destroys both connection pools and leaves the exit code untouched on success', async () => {
    mocks.flipSentCampaignHousings.mockResolvedValue({
      campaigns: 0,
      housings: 0,
      failed: 0
    });

    await main();

    expect(process.exitCode).toBeUndefined();
    expect(mocks.dbDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.kyselyDestroy).toHaveBeenCalledTimes(1);
  });

  it('sets a non-zero exit code when some campaigns failed, even though the run resolved', async () => {
    mocks.flipSentCampaignHousings.mockResolvedValue({
      campaigns: 3,
      housings: 2,
      failed: 1
    });

    await main();

    expect(process.exitCode).toBe(1);
    expect(mocks.logger.error).toHaveBeenCalled();
  });
});
