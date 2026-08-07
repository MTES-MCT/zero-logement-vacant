import { fc, test } from '@fast-check/vitest';
import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { isSendDateReached, isSendDateInFuture } from '~/models/CampaignApi';

const yyyyMMdd = () =>
  fc
    .date({
      min: new Date('0001-01-01'),
      max: new Date('9999-12-31'),
      noInvalidDate: true
    })
    .map((date) => date.toISOString().slice(0, 10));

// Kept clear of year 0/negative years and of 5-digit years: date-fns'
// `format()` follows the CLDR "year of era" convention below year 1 (year 0
// formats as "0001", i.e. 1 BC) and emits a 5th digit past year 9999 — both
// would make this test's independent oracle disagree with a correct
// isSendDateReached/isSendDateInFuture, as date-fns formatting quirks rather
// than bugs in the functions under test. `today` keeps a margin comfortably
// wider than the largest offset below in both directions.
const yyyyMMddSafeForDateArithmetic = () =>
  fc
    .date({
      min: new Date('0200-01-01'),
      max: new Date('9900-12-31'),
      noInvalidDate: true
    })
    .map((date) => date.toISOString().slice(0, 10));

const timeOfDay = () =>
  fc.date({ noInvalidDate: true }).map((date) => date.toISOString().slice(11));

describe('isSendDateReached', () => {
  const today = '2026-07-15';

  it('returns false when sentAt is null', () => {
    expect(isSendDateReached(null, today)).toBe(false);
  });

  it('returns false when sentAt is in the future', () => {
    expect(isSendDateReached('2026-07-16', today)).toBe(false);
  });

  it('returns true when sentAt is today', () => {
    expect(isSendDateReached('2026-07-15', today)).toBe(true);
  });

  it('returns true when sentAt is in the past', () => {
    expect(isSendDateReached('2026-07-14', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateReached('2026-07-15T23:59:59.000Z', today)).toBe(true);
  });
});

describe('isSendDateInFuture', () => {
  const today = '2026-07-23';

  it('returns false when sentAt is null', () => {
    expect(isSendDateInFuture(null, today)).toBe(false);
  });

  it('returns false when sentAt is today', () => {
    expect(isSendDateInFuture('2026-07-23', today)).toBe(false);
  });

  it('returns false when sentAt is in the past', () => {
    expect(isSendDateInFuture('2020-01-01', today)).toBe(false);
  });

  it('returns true when sentAt is strictly after today', () => {
    expect(isSendDateInFuture('2999-01-01', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateInFuture('2999-01-01T23:59:59.000Z', today)).toBe(true);
  });
});

// Property-based coverage (per the feature's own design doc): hand-picked
// examples above can't rule out an off-by-one at a month/year rollover that
// a fixed set of dates doesn't happen to land on.
describe('isSendDateReached and isSendDateInFuture (property-based)', () => {
  test.prop(
    [
      yyyyMMddSafeForDateArithmetic(),
      fc.integer({ min: -10_000, max: 10_000 })
    ],
    { numRuns: 500 }
  )(
    'match independent date-arithmetic for any day offset from today, across month/year rollovers',
    (today, offsetDays) => {
      const sentAt = format(
        addDays(new Date(`${today}T00:00:00.000Z`), offsetDays),
        'yyyy-MM-dd'
      );

      expect(isSendDateReached(sentAt, today)).toBe(offsetDays <= 0);
      expect(isSendDateInFuture(sentAt, today)).toBe(offsetDays > 0);
    }
  );

  test.prop([yyyyMMdd(), yyyyMMdd()], { numRuns: 200 })(
    'are mutually exclusive for a non-null sentAt: exactly one is true',
    (sentAt, today) => {
      expect(isSendDateReached(sentAt, today)).toBe(
        !isSendDateInFuture(sentAt, today)
      );
    }
  );

  test.prop([yyyyMMdd()], { numRuns: 200 })(
    'return false for a null sentAt regardless of today',
    (today) => {
      expect(isSendDateReached(null, today)).toBe(false);
      expect(isSendDateInFuture(null, today)).toBe(false);
    }
  );

  test.prop([yyyyMMdd()], { numRuns: 200 })(
    'treat sentAt === today as reached but not future',
    (today) => {
      expect(isSendDateReached(today, today)).toBe(true);
      expect(isSendDateInFuture(today, today)).toBe(false);
    }
  );

  test.prop([yyyyMMdd(), timeOfDay(), yyyyMMdd()], { numRuns: 200 })(
    'ignore the time-of-day component of a longer ISO sentAt',
    (datePart, time, today) => {
      const sentAtWithTime = `${datePart}T${time}`;

      expect(isSendDateReached(sentAtWithTime, today)).toBe(
        isSendDateReached(datePart, today)
      );
      expect(isSendDateInFuture(sentAtWithTime, today)).toBe(
        isSendDateInFuture(datePart, today)
      );
    }
  );
});
