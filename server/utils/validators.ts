import validator from 'validator';

type Refinement = (value: unknown) => boolean;

export function isArrayOf(refine: Refinement) {
  return (values: unknown | undefined): boolean => {
    return (
      values !== undefined && Array.isArray(values) && values.every(refine)
    );
  };
}

type Coerce<T> = (value: string) => T;

export function toArrayOf<T>(coerce: Coerce<T>) {
  return (values: string[]): T[] => values.map(coerce);
}

export function toNumber(value: string): number {
  return Number(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isInteger(value: unknown): boolean {
  return typeof value === 'number' && validator.isInt(value.toString());
}

export function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

export function isUUID(value: unknown): boolean {
  return isString(value) && validator.isUUID(value);
}
