import { isDate } from 'date-fns';
import { Array, pipe, Predicate, Record } from 'effect';
import { useEffect, useRef, useState } from 'react';
import * as yup from 'yup';
import type { ObjectShape } from 'yup';
import { parseDateInput } from '../utils/dateUtils';

export const emailValidator = yup
  .string()
  .required('Veuillez renseigner votre adresse email.')
  .email("L'adresse doit être un email valide. Exemple de format valide : exemple@gmail.com");

export const passwordFormatValidator = yup
  .string()
  .min(12, 'Au moins 12 caractères.')
  .matches(/[A-Z]/g, {
    name: 'uppercase',
    message: 'Au moins une majuscule.'
  })
  .matches(/[a-z]/g, {
    name: 'lowercase',
    message: 'Au moins une minuscule.'
  })
  .matches(/[0-9]/g, {
    name: 'number',
    message: 'Au moins un chiffre.'
  });

export const passwordConfirmationValidator = yup
  .string()
  .required('Veuillez confirmer votre mot de passe.')
  .oneOf([yup.ref('password')], 'Les mots de passe doivent être identiques.');

export const campaignTitleValidator = yup
  .string()
  .max(64, 'La longueur maximale du titre de la campagne est de 64 caractères.')
  .required('Veuillez renseigner le titre de la campagne.');

export const campaignDescriptionValidator = yup
  .string()
  .max(
    1000,
    'La longueur maximale de la description de la campagne est de 1000 caractères.'
  );

export const dateValidator = yup
  .date()
  .transform((_curr, originalValue) => {
    return !originalValue || !originalValue.length
      ? null
      : isDate(originalValue)
        ? originalValue
        : parseDateInput(originalValue);
  })
  .typeError('Veuillez renseigner une date valide.');

export const fileValidator = (supportedFormats: string[]) =>
  yup
    .mixed<File>()
    .required('Veuillez sélectionner un fichier')
    .test(
      'fileType',
      'Format de fichier invalide',
      (value) => value && supportedFormats.includes(value.type)
    );

export const banAddressValidator = yup.object();

export const birthDateValidator = dateValidator.nullable().notRequired();

export type MessageType = 'error' | 'success' | 'default';

interface Message {
  text: string;
  type: Omit<MessageType, ''>;
}

/**
 * @deprecated Use [react-hook-form](https://react-hook-form.com/) instead.
 * @param schema
 * @param input
 * @param fullValidationKeys
 */
export function useForm<
  T extends yup.AnyObject,
  U extends Record<keyof T, unknown>
>(schema: yup.ObjectSchema<T>, input: U, fullValidationKeys?: (keyof U)[]) {
  const [errors, setErrors] = useState<yup.ValidationError[]>();
  const [touchedKeys, setTouchedKeys] = useState<Set<keyof U>>(new Set());

  const previousInput = useRef<U>();

  const isDirty = touchedKeys.size > 0;

  function error<K extends keyof U>(key?: K): yup.ValidationError | undefined {
    return key && touchedKeys.has(key)
      ? errors?.find((error) => error && error.path === key)
      : undefined;
  }

  /**
   * Return all the errors related to a given field.
   * @param key
   */
  function errorList<K extends keyof U>(
    key?: K
  ): yup.ValidationError[] | undefined {
    return key && touchedKeys.has(key)
      ? errors?.filter((error) => error.path === key)
      : undefined;
  }

  function hasError<K extends keyof U>(key?: K): boolean {
    return error(key) !== undefined;
  }

  function isValid(): boolean {
    return !hasError();
  }

  function labels<K extends keyof U>(key?: K): string[] {
    if (key) {
      return (schema.fields[key] as any).tests.map(
        (test: any) => test.OPTIONS.message
      );
    }
    return Object.values(schema.fields)
      .flatMap((field) => (field as any).tests)
      .map((test) => test.OPTIONS.message);
  }

  function message<K extends keyof U>(
    key: K,
    whenValid?: string
  ): string | undefined {
    return messageType(key) === 'success' && whenValid
      ? whenValid
      : error(key)?.message;
  }

  /**
   * Return individual messages for a given field.
   * @param key
   */
  function messageList<K extends keyof U>(key: K): Message[] {
    return labels(key).map((label) => ({
      text: label,
      type: errorList(key)?.find((error) => error.message === label)
        ? 'error'
        : 'valid'
    }));
  }

  function messageType<K extends keyof U>(key: K): MessageType {
    if (touchedKeys.has(key)) {
      if (hasError(key)) {
        return 'error';
      }
    }
    return 'default';
  }

  function errorsExcept<K extends keyof U>(key: K) {
    return (errors ?? []).filter((error) => error.path !== key);
  }

  async function validate(onValid?: () => Promise<void> | void) {
    try {
      setTouchedKeys(new Set(keysDeep(schema.fields)));
      await schema.validate(input, { abortEarly: false });
      setErrors(undefined);
      await onValid?.();
    } catch (errors) {
      setErrors((errors as yup.ValidationError).inner);
    }
  }

  async function validateAt<K extends keyof U>(key: K) {
    setTouchedKeys(touchedKeys.add(key));
    try {
      await schema.validateAt(String(key), input, {
        abortEarly: !fullValidationKeys?.includes(key)
      });
      setErrors([...errorsExcept(key)]);
    } catch (validationError) {
      setErrors([
        ...errorsExcept(key),
        ...(!fullValidationKeys?.includes(key)
          ? [validationError as yup.ValidationError]
          : (validationError as yup.ValidationError).inner)
      ]);
    }
  }

  useEffect(() => {
    const validations = entriesDeep(input)
      .filter(([k1, v1]) =>
        entriesDeep(previousInput.current || {}).find(
          ([k2, v2]) => k1 === k2 && v1 !== v2
        )
      )
      .filter(([key]) => touchedKeys.has(key))
      .map(([key]) => validateAt(key));
    (async () => {
      await Promise.all(validations);
      previousInput.current = input;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(input)]);

  useEffect(() => {
    const validations = (fullValidationKeys ?? []).map((key) =>
      validateAt(key)
    );
    (async () => await Promise.all(validations))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, fullValidationKeys);

  return {
    isDirty,
    isValid,
    hasError,
    messageList,
    message,
    messageType,
    validate,
    validateAt
  };
}

export function keysDeep(record: ObjectShape, prefix: string = ''): string[] {
  return pipe(
    record,
    Array.fromRecord,
    Array.map(([key, value]) => {
      return value instanceof yup.ObjectSchema
        ? keysDeep(value.fields, `${key}.`)
        : [`${prefix}${key}`];
    }),
    Array.flatten
  );
}

export function entriesDeep(record: object, prefix = ''): [string, unknown][] {
  // @ts-expect-error: to be removed
  return pipe(
    record,
    // @ts-expect-error: to be removed
    Array.fromRecord,
    Array.flatMap<[string, unknown], [string, unknown]>(([key, value]) =>
      // @ts-expect-error: to be removed
      Predicate.isRecord(value)
        ? entriesDeep(value, `${key}.`)
        : [[`${prefix}${key}`, value]]
    )
  );
}
