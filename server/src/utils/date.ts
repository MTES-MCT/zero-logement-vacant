import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

// ZLV caseworkers are French; "today" must match their Europe/Paris calendar
// day regardless of the server process's own timezone (unpinned, and UTC
// disagrees with Paris for up to 2h a day around midnight during CEST).
const TIMEZONE = 'Europe/Paris';

/**
 * The current calendar date in Europe/Paris as a `yyyy-MM-dd` string, for
 * comparing against campaign `sentAt` values (also `yyyy-MM-dd`).
 */
export function today(): string {
  return format(TZDate.tz(TIMEZONE), 'yyyy-MM-dd');
}
