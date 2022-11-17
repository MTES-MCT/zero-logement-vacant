import { useEffect, useState } from "react";
import * as yup from "yup";
import { ObjectShape } from "yup/lib/object";

export const emailValidator = yup
  .string()
  .required('Veuillez renseigner votre adresse email.')
  .email('L\'adresse doit être un email valide')

export const passwordValidator = yup
  .string()
  .required('Veuillez renseigner un mot de passe.')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/, 'Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre.')

export const passwordConfirmationValidator = yup
  .string()
  .required('Veuillez confirmer votre mot de passe.')
  .oneOf([yup.ref('password')], 'Les mots de passe doivent être identiques.')

export const campaignTitleValidator = yup
    .string()
    .required('Veuillez renseigner le titre de la campagne.')

export function useForm<T extends ObjectShape, U extends Record<keyof T, unknown>>(
  schema: yup.ObjectSchema<T>,
  input: U
) {
  const [errors, setErrors] = useState<yup.ValidationError>()
  const [isTouched, setIsTouched] = useState(false)

  function error<K extends keyof U>(key?: K): yup.ValidationError | undefined {
    return isTouched
      && key ? errors?.inner.find(error => error.path === key) : errors
  }

  function hasError<K extends keyof U>(key?: K): boolean {
    return error(key) !== undefined
  }

  function isValid(): boolean {
    return isTouched && !hasError()
  }

  function message<K extends keyof U>(key: K): string | undefined {
    return error(key)?.message
  }

  function messageType<K extends keyof U>(key: K): string | undefined {
    if (isTouched) {
      if (hasError(key)) {
        return 'error'
      }
      return 'valid'
    }
    return ''
  }

  async function validate() {
    try {
      setIsTouched(true)
      await schema.validate(input, { abortEarly: false })
      setErrors(undefined)
    } catch (errors) {
      setErrors(errors as yup.ValidationError)
    }
  }

  useEffect(() => {
    if (isTouched) {
      validate()
    } else {
      if (Object.values(input).some(value => !!value)) {
        setIsTouched(true)
        validate()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(input))

  return {
    isTouched,
    isValid,
    hasError,
    message,
    messageType,
    validate
  }
}
