import { formatDuration, intervalToDuration } from 'date-fns';

type DoneFn = () => string;
type CallbackFn = (done: DoneFn) => void;

export function startTimer(callback: CallbackFn): void {
  const start = new Date();
  callback(() => {
    const end = new Date();
    const duration = intervalToDuration({ start, end });
    return formatDuration(duration);
  });
}
