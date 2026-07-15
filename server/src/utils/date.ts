import { format } from 'date-fns';

/**
 * The server's current calendar date as a `yyyy-MM-dd` string, for comparing
 * against campaign `sentAt` values (also `yyyy-MM-dd`).
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
