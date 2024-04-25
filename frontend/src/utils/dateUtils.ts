import {
  add,
  differenceInMilliseconds,
  differenceInYears,
  format,
  parse,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const dateSort = (d1?: Date, d2?: Date) =>
  d1 ? (d2 ? differenceInMilliseconds(d1, d2) : 1) : d2 ? -1 : 0;

export const durationSort = (d1?: Duration, d2?: Duration) =>
  d1
    ? d2
      ? dateSort(add(new Date(), d1), add(new Date(), d2))
      : 1
    : d2
    ? -1
    : 0;

export const dateShortFormat = (d: Date) =>
  format(d, 'dd/MM/yy', { locale: fr });

export const dateShortFormatWithMinutes = (d: Date) =>
  format(d, 'dd/MM/yy à k:mm', { locale: fr });

export const parseDateInput = (s: string) =>
  s.length ? parse(s, 'yyyy-MM-dd', new Date()) : undefined;

export function birthdate(date: Date | string): string {
  return format(
    typeof date === 'string' ? parseISO(date) : date,
    'dd/MM/yyyy',
    { locale: fr }
  );
}

export function age(date: Date): number {
  return differenceInYears(new Date(), date);
}

export const DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;
