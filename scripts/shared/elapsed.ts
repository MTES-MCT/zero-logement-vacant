import { Interval, formatDuration, intervalToDuration } from 'date-fns';

type DoneFn = () => string;
type CallbackFn = (done: DoneFn) => void;

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

export function startTimer(callback: CallbackFn): void {
  const start = new Date();
  callback(() => {
    const end = new Date();
    const duration = intervalToDuration({ start, end });
    return formatDuration(duration);
  });
}
