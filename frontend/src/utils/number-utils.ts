export interface ToPercentageOptions {
  decimals?: number;
}

export function toPercentage(
  value: number,
  options?: ToPercentageOptions
): string {
  const decimals = options?.decimals ?? 1;
  return new Intl.NumberFormat('fr', {
    style: 'percent',
    maximumFractionDigits: decimals
  }).format(value);
}
