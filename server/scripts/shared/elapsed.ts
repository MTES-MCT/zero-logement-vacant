import { Interval, formatDuration, intervalToDuration } from 'date-fns';

export function timer() {
  const start = new Date();
  return (): Interval => {
    const end = new Date();
    return { start, end };
  };
}

export function formatElapsed(interval: Interval): string {
  return formatDuration(intervalToDuration(interval));
}
