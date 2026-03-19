import { Number, pipe } from 'effect';

export interface ToPercentageOptions {
  decimals?: number;
}

export function toPercentage(
  value: number,
  options?: ToPercentageOptions
): string {
  const decimals = options?.decimals ?? 2;
  return pipe(
    value,
    Number.round(decimals),
    Number.multiply(100),
    (n) => `${n} %`
  );
}
