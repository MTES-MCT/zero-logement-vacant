import validator from 'validator';
import { body, param, ValidationChain } from 'express-validator';

import { Predicate } from '@zerologementvacant/shared';

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

export function hasKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

export const emailValidator = () =>
  body('email').isEmail().withMessage('Must be an email');

export const PASSWORD_MIN_LENGTH = 8;

export const passwordCreationValidator = (
  field = 'password',
): ValidationChain =>
  body(field)
    .isStrongPassword({
      minLength: PASSWORD_MIN_LENGTH,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 0,
      minLowercase: 1,
    })
    .withMessage(
      `Must be at least ${PASSWORD_MIN_LENGTH} characters long, have 1 number, 1 uppercase, 1 lowercase`,
    );

export const isUUIDParam = (paramField: string): ValidationChain =>
  param(paramField).isUUID().notEmpty().withMessage('Must be a UUID');
