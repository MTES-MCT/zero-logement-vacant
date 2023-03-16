export const percent = (value?: number, total?: number) =>
  !value || Number(value) === 0
    ? 0
    : Math.round(
        (value / (total && Number(total) !== 0 ? total : value)) * 10000
      ) / 100;

export const numberSort = (n1?: number, n2?: number) =>
  n1 ? (n2 ? n1 - n2 : 1) : n2 ? -1 : 0;

export const numberOption = (value: string | undefined) =>
  value ? Number(value) : undefined;
