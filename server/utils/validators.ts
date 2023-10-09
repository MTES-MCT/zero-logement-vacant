import validator from 'validator';
import { body, param, ValidationChain } from 'express-validator';

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

export const emailValidator = () =>
  body('email').isEmail().withMessage('Must be an email');

export const PASSWORD_MIN_LENGTH = 8;

export const passwordCreationValidator = (
  field = 'password'
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
      `Must be at least ${PASSWORD_MIN_LENGTH} characters long, have 1 number, 1 uppercase, 1 lowercase`
    );

export const isUUIDParam = (paramField: string): ValidationChain =>
  param(paramField).isUUID().notEmpty().withMessage('Must be a UUID');
