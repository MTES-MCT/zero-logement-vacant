import validator from 'validator';
import { param, ValidationChain } from 'express-validator';
import { Predicate } from '@zerologementvacant/utils';

type Refinement = (value: unknown) => boolean;

export function isArrayOf(refine: Refinement) {
  return (values: unknown | undefined): boolean => {
    return (
      values !== undefined && Array.isArray(values) && values.every(refine)
    );
  };
}

export function every<T>(predicate: Predicate<T>) {
  return (values: T[]): boolean => values.every(predicate);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isCommaDelimitedString(value: unknown): value is string {
  const pattern = /^[-\w]+(,[-\w]+)*$/;
  return isString(value) && validator.matches(value, pattern);
}

export function split(separator: string) {
  return (value: string): string[] => value.split(separator);
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

export function isGeoCode(value: string): boolean {
  return (
    validator.isAlphanumeric(value) &&
    validator.isLength(value, { min: 5, max: 5 })
  );
}

export const isUUIDParam = (paramField: string): ValidationChain =>
  param(paramField).isUUID().notEmpty().withMessage('Must be a UUID');
