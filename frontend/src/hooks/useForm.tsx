import React, { useEffect, useRef, useState } from 'react';
import * as yup from 'yup';
import { ObjectShape } from 'yup/lib/object';
import { isDate } from 'date-fns';
import { parseDateInput } from '../utils/dateUtils';

export const emailValidator = yup
  .string()
  .required('Veuillez renseigner votre adresse email.')
  .email("L'adresse doit être un email valide");

export const passwordValidator = yup
  .string()
  .required('Veuillez renseigner votre nouveau mot de passe.')
  .min(8, 'Au moins 8 caractères.')
  .matches(/[A-Z]/g, {
    name: 'uppercase',
    message: 'Au moins une majuscule.',
  })
  .matches(/[a-z]/g, {
    name: 'lowercase',
    message: 'Au moins une minuscule.',
  })
  .matches(/[0-9]/g, {
    name: 'number',
    message: 'Au moins un chiffre.',
  });

export const passwordConfirmationValidator = yup
  .string()
  .required('Veuillez confirmer votre mot de passe.')
  .oneOf([yup.ref('password')], 'Les mots de passe doivent être identiques.');

export const campaignTitleValidator = yup
  .string()
  .required('Veuillez renseigner le titre de la campagne.');

export const dateValidator = yup
  .date()
  .transform((curr, originalValue) => {
    return !originalValue.length
      ? null
      : isDate(originalValue)
      ? originalValue
      : parseDateInput(originalValue);
  })
  .typeError('Veuillez renseigner une date valide.');

export const fileValidator = (supportedFormats: string[]) =>
  yup
    .mixed()
    .required('Veuillez sélectionner un fichier')
    .test(
      'fileType',
      'Format de fichier invalide',
      (value) => value && supportedFormats.includes(value.type)
    );

interface UseFormOptions {
  dependencies?: React.DependencyList;
  disableValidationOnTouch?: boolean;
}

type MessageType = 'error' | 'valid' | '';

interface Message {
  text: string;
  type: Omit<MessageType, ''>;
}

export function useForm<
  T extends ObjectShape,
  U extends Record<keyof T, unknown>
>(schema: yup.ObjectSchema<T>, input: U, options?: UseFormOptions) {
  const [errors, setErrors] = useState<yup.ValidationError[]>();
  const [touchedKeys, setTouchedKeys] = useState<Array<keyof U>>([]);

  const previousInput = useRef<U>();

  function error<K extends keyof U>(key?: K): yup.ValidationError | undefined {
    return key && touchedKeys.includes(key)
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
    return key && touchedKeys.includes(key)
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
    return messageType(key) === 'valid' && whenValid
      ? whenValid
      : error(key)?.message;
  }

  /**
   * Return individual messages for a given field.
   * @param key
   */
  function messageList<K extends keyof U>(key: K): Message[] {
    return labels(key).map((label) => {
      return {
        text: label,
        type: errorList(key)?.find((error) => error.message === label)
          ? 'error'
          : 'valid',
      };
    });
  }

  function messageType<K extends keyof U>(key: K): MessageType {
    if (touchedKeys.includes(key)) {
      if (hasError(key)) {
        return 'error';
      }
      return 'valid';
    }
    return '';
  }

  async function validate(onValid?: () => void) {
    try {
      setTouchedKeys(Object.keys(schema.fields));
      await schema.validate(input, { abortEarly: false });
      setErrors(undefined);
      onValid?.();
    } catch (errors) {
      setErrors((errors as yup.ValidationError).inner);
    }
  }

  async function validateAt<K extends keyof U>(key: K) {
    setTouchedKeys([...touchedKeys.filter((_) => _ !== key), key]);
    try {
      await schema.validateSyncAt(String(key), input);
      setErrors([...(errors ?? [])?.filter((error) => error.path !== key)]);
    } catch (validationError) {
      setErrors([
        ...(errors ?? [])?.filter((error) => error.path !== key),
        validationError as yup.ValidationError,
      ]);
    }
  }

  useEffect(() => {
    Object.entries(input)
      .filter(([k1, v1]) =>
        Object.entries(previousInput.current || {}).find(
          ([k2, v2]) => k1 === k2 && v1 !== v2
        )
      )
      .filter(([key, _]) => touchedKeys.includes(key))
      .forEach(([key, _]) => validateAt(key));
    previousInput.current = input;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(input)]);

  return {
    isValid,
    hasError,
    messageList,
    message,
    messageType,
    validate,
    validateAt,
  };
}
