import React, { useEffect, useState } from 'react';
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
  const [errors, setErrors] = useState<yup.ValidationError>();
  const [isTouched, setIsTouched] = useState(false);

  function error<K extends keyof U>(key?: K): yup.ValidationError | undefined {
    return isTouched && key
      ? errors?.inner.find((error) => error.path === key)
      : errors;
  }

  /**
   * Return all the errors related to a given field.
   * @param key
   */
  function errorList<K extends keyof U>(
    key?: K
  ): yup.ValidationError[] | undefined {
    return isTouched && key
      ? errors?.inner.filter((error) => error.path === key)
      : errors?.inner;
  }

  function hasError<K extends keyof U>(key?: K): boolean {
    return error(key) !== undefined;
  }

  function isValid(): boolean {
    return isTouched && !hasError();
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
    if (!isTouched) {
      return [];
    }

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
    if (isTouched) {
      if (hasError(key)) {
        return 'error';
      }
      return 'valid';
    }
    return '';
  }

  async function validate() {
    try {
      setIsTouched(true);
      await schema.validate(input, { abortEarly: false });
      setErrors(undefined);
    } catch (errors) {
      setErrors(errors as yup.ValidationError);
    }
  }

  useEffect(() => {
    if (isTouched || options?.dependencies?.length) {
      validate();
    } else {
      if (
        !options?.disableValidationOnTouch &&
        Object.values(input).some((value) => !!value)
      ) {
        setIsTouched(true);
        validate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(input), ...(options?.dependencies ?? [])]);

  return {
    isTouched,
    isValid,
    hasError,
    messageList,
    message,
    messageType,
    validate,
  };
}
