import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers-next/yup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TIME_PER_WEEK_VALUES } from '@zerologementvacant/models';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { object, ref, string, type InferType } from 'yup-next';

import { useUser } from '~/hooks/useUser';
import {
  useGetUserQuery,
  useUpdateUserMutation
} from '~/services/user.service';
import { useNotification } from '../../hooks/useNotification';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import TimePerWeekSelect from '../Users/TimePerWeekSelect';
import { skipToken } from '@reduxjs/toolkit/query';

const schema = object({
  firstName: string().nullable().default(null),
  lastName: string().nullable().default(null),
  phone: string().nullable().default(null),
  position: string().nullable().default(null),
  timePerWeek: string().oneOf(TIME_PER_WEEK_VALUES).nullable().default(null)
})
  .required()
  .shape(
    {
      currentPassword: string()
        .nullable()
        .default(null)
        .when(['password', 'passwordConfirmation'], {
          is: (password: string | null, passwordConfirmation: string | null) =>
            password !== null || passwordConfirmation !== null,
          then: (schema) =>
            schema.required('Veuillez entrer votre mot de passe actuel.')
        }),
      password: string()
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
        })
        .nullable()
        .default(null)
        .when(['currentPassword', 'passwordConfirmation'], {
          is: (
            currentPassword: string | null,
            passwordConfirmation: string | null
          ) => currentPassword !== null || passwordConfirmation !== null,
          then: (schema) =>
            schema.required('Veuillez entrer un nouveau mot de passe.')
        }),
      passwordConfirmation: string()
        .nullable()
        .default(null)
        .when('password', {
          is: (password: string | null) => password !== null,
          then: (schema) =>
            schema
              .required('Veuillez confirmer votre mot de passe.')
              .oneOf(
                [ref('password')],
                'Les mots de passe doivent être identiques.'
              )
        })
    },
    [
      ['currentPassword', 'password'],
      ['currentPassword', 'passwordConfirmation'],
      ['password', 'passwordConfirmation']
    ]
  );

type FormSchema = InferType<typeof schema>;

function AccountForm() {
  const { user: auth } = useUser();
  // We must fetch the up-to-date user until `useUser` is refactored
  const { data: user } = useGetUserQuery(auth?.id ?? skipToken);
  const [updateUser, updateUserMutation] = useUpdateUserMutation();

  const form = useForm<FormSchema>({
    values: {
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      phone: user?.phone ?? null,
      position: user?.position ?? null,
      timePerWeek: user?.timePerWeek ?? null,
      currentPassword: null,
      password: null,
      passwordConfirmation: null
    },
    mode: 'onSubmit',
    // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
    resolver: yupResolver(schema)
  });

  useNotification({
    toastId: 'update-account-toast',
    isError: updateUserMutation.isError,
    isLoading: updateUserMutation.isLoading,
    isSuccess: updateUserMutation.isSuccess,
    message: {
      error: 'Erreur lors de la mise à jour du profil',
      loading: 'Mise à jour du profil...',
      success: 'Profil mis à jour !'
    }
  });

  function submit(values: FormSchema) {
    if (!user) {
      return;
    }

    // Update account info
    const password =
      values.currentPassword && values.password
        ? {
            password: {
              before: values.currentPassword,
              after: values.password
            }
          }
        : {};

    updateUser({
      id: user.id,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      position: values.position,
      timePerWeek: values.timePerWeek,
      ...password
    })
      .unwrap()
      .then((user) => {
        form.reset({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          position: user.position,
          timePerWeek: user.timePerWeek,
          currentPassword: null,
          password: null,
          passwordConfirmation: null
        });
      });
  }

  return (
    <FormProvider {...form}>
      <form id="account-form" onSubmit={form.handleSubmit(submit)}>
        <Stack spacing={4} useFlexGap sx={{ maxWidth: '25rem' }}>
          <Box>
            <Typography component="h2" variant="h6" mb={2}>
              Réinitialisation de mon mot de passe
            </Typography>

            <Stack spacing="-0.75rem">
              <AppTextInputNext<FormSchema['currentPassword']>
                name="currentPassword"
                label="Mot de passe actuel (obligatoire)"
                nativeInputProps={{ type: 'password' }}
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
              <AppTextInputNext<FormSchema['password']>
                name="password"
                label="Nouveau mot de passe (obligatoire)"
                hintText="Votre nouveau mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un chiffre."
                nativeInputProps={{ type: 'password' }}
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
              <AppTextInputNext<FormSchema['passwordConfirmation']>
                name="passwordConfirmation"
                label="Confirmation du nouveau mot de passe (obligatoire)"
                nativeInputProps={{ type: 'password' }}
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
            </Stack>
          </Box>

          <Box>
            <Typography component="h2" variant="h6" mb={2}>
              Mes informations personnelles
            </Typography>

            <Stack spacing="-0.75rem">
              <AppTextInputNext<FormSchema['firstName']>
                name="firstName"
                label="Prénom"
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
              <AppTextInputNext<FormSchema['lastName']>
                name="lastName"
                label="Nom"
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
              <AppTextInputNext<FormSchema['phone']>
                name="phone"
                label="Téléphone"
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
                nativeInputProps={{
                  type: 'tel',
                  autoComplete: 'tel',
                  placeholder: '0123456789 ou +33123456789'
                }}
              />
              <AppTextInputNext<FormSchema['position']>
                name="position"
                label="Poste"
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => (value === '' ? null : value)}
              />
              <Controller
                name="timePerWeek"
                render={({ field }) => (
                  <TimePerWeekSelect
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(value) => field.onChange(value)}
                  />
                )}
              />

              <Button type="submit">Enregistrer les modifications</Button>
            </Stack>
          </Box>
        </Stack>
      </form>
    </FormProvider>
  );
}

export default AccountForm;
