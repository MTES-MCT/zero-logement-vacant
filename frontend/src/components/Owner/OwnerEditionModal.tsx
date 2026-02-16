import { fr } from '@codegouvfr/react-dsfr';
import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import schemas from '@zerologementvacant/schemas';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { number, object, string, type InferType } from 'yup';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import {
  createExtendedModal,
  type ExtendedModalProps
} from '~/components/modals/ConfirmationModal/ExtendedModal';
import Icon from '~/components/ui/Icon';
import { useNotification } from '~/hooks/useNotification';
import type { Owner } from '~/models/Owner';
import { useUpdateOwnerMutation } from '~/services/owner.service';
import OwnerAddressEdition from '../OwnerAddressEdition/OwnerAddressEdition';

const schema = object({
  fullName: string().required(
    'Veuillez saisir le nom et prénom du propriétaire'
  ),
  birthDate: string().nullable().defined(),
  banAddress: object({
    id: string().required(),
    label: string().required(),
    score: number().required().min(0).max(1),
    longitude: number().min(-180).max(180).nullable().defined(),
    latitude: number().min(-90).max(90).nullable().defined()
  })
    .nullable()
    .defined(),
  additionalAddress: string().nullable().defined(),
  email: string()
    .email('Email invalide. Exemple de format valide : exemple@gmail.com')
    .nullable()
    .defined(),
  phone: schemas.phone.nullable().defined()
}).required();
type FormSchema = InferType<typeof schema>;

export type OwnerEditionModalProps = Omit<
  ExtendedModalProps,
  'children' | 'title'
> & {
  owner: Owner;
};

function createOwnerEditionModalNext() {
  const modal = createExtendedModal({
    id: 'owner-edition-modal-next',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: OwnerEditionModalProps) {
      const form = useForm<FormSchema>({
        values: {
          fullName: props.owner.fullName,
          birthDate: props.owner.birthDate ?? null,
          banAddress: props.owner.banAddress
            ? {
                id: props.owner.banAddress.banId ?? '',
                label: props.owner.banAddress.label,
                score: props.owner.banAddress.score ?? 0,
                longitude: props.owner.banAddress.longitude ?? null,
                latitude: props.owner.banAddress.latitude ?? null
              }
            : null,
          additionalAddress: props.owner.additionalAddress ?? null,
          email: props.owner.email ?? null,
          phone: props.owner.phone ?? null
        } satisfies FormSchema,
        resolver: yupResolver(schema)
      });

      const [updateOwner, updateOwnerMutation] = useUpdateOwnerMutation();
      useNotification({
        toastId: 'owner-edition-toast',
        isError: updateOwnerMutation.isError,
        isLoading: updateOwnerMutation.isLoading,
        isSuccess: updateOwnerMutation.isSuccess,
        message: {
          error: 'Erreur lors de la modification du propriétaire',
          loading: 'Modification du propriétaire...',
          success: 'Propriétaire modifié avec succès'
        }
      });

      const { isDirty } = form.formState;

      function onCancel() {
        modal.close();
        if (isDirty) {
          form.reset();
        }
      }

      function onSubmit(payload: FormSchema) {
        if (!isDirty) {
          modal.close();
          return;
        }

        updateOwner({
          id: props.owner.id,
          fullName: payload.fullName,
          birthDate: payload.birthDate,
          banAddress: payload.banAddress
            ? {
                banId: payload.banAddress.id,
                label: payload.banAddress.label,
                score: payload.banAddress.score,
                postalCode: '',
                city: '',
                longitude: payload.banAddress.longitude ?? undefined,
                latitude: payload.banAddress.latitude ?? undefined
              }
            : null,
          additionalAddress: payload.additionalAddress,
          email: payload.email,
          phone: payload.phone
        })
          .unwrap()
          .then(() => {
            modal.close();
          });
      }

      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <modal.Component
              size="large"
              buttons={[
                {
                  children: 'Annuler',
                  priority: 'secondary',
                  className: 'fr-mr-2w',
                  onClick: onCancel,
                  doClosesModal: false
                },
                {
                  children: 'Enregistrer',
                  onClick: form.handleSubmit(onSubmit),
                  doClosesModal: false
                }
              ]}
              {...props}
              title='Éditer les informations du propriétaire'
            >
              <Stack spacing="1.5rem">
                <Grid
                  component="section"
                  container
                  columnSpacing="1rem"
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AppTextInputNext
                      name="fullName"
                      label="Nom et prénom (obligatoire)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AppTextInputNext<FormSchema>
                      name="birthDate"
                      label="Date de naissance"
                      nativeInputProps={{
                        type: 'date',
                        max: new Date()
                          .toISOString()
                          .substring(0, 'yyyy-mm-dd'.length)
                      }}
                    />
                  </Grid>
                </Grid>

                <Stack component="section">
                  <Stack
                    direction="row"
                    spacing="0.25rem"
                    sx={{ alignItems: 'center' }}
                  >
                    <Icon name="fr-icon-bank-line" size="sm" />
                    <Typography
                      color={fr.colors.decisions.text.active.grey.default}
                    >
                      Adresse fiscale (source: DGFIP)
                    </Typography>
                  </Stack>
                  <Typography className="fr-hint-text">
                    Adresse issue des fichiers LOVAC (non modifiable).
                  </Typography>
                  <Typography
                    color={fr.colors.decisions.text.default.grey.default}
                    sx={{ mt: '0.5rem' }}
                  >
                    {props.owner.rawAddress
                      ? props.owner.rawAddress.join(' ')
                      : 'Inconnue'}
                  </Typography>
                </Stack>

                <Stack component="section">
                  <Stack
                    direction="row"
                    spacing="0.25rem"
                    sx={{ alignItems: 'center' }}
                  >
                    <Icon name="fr-icon-home-4-line" size="sm" />
                    <Typography
                      color={fr.colors.decisions.text.active.grey.default}
                    >
                      Adresse postale (source: Base Adresse Nationale)
                    </Typography>
                  </Stack>
                  <Controller
                    control={form.control}
                    name="banAddress"
                    render={({ field, fieldState }) => (
                      <OwnerAddressEdition
                        disabled={field.disabled}
                        errorMessage={fieldState.error?.message}
                        warningVisible={false}
                        setWarningVisible={() => {}}
                        banAddress={
                          field.value
                            ? {
                                banId: field.value.id,
                                label: field.value.label,
                                score: field.value.score ?? 0,
                                postalCode: '',
                                city: ''
                              }
                            : null
                        }
                        onSelectAddress={(value) => {
                          field.onChange(
                            value
                              ? {
                                  id: value.banId,
                                  label: value.label,
                                  score: value.score ?? 0,
                                  longitude: value.longitude,
                                  latitude: value.latitude
                                }
                              : null
                          );
                        }}
                      />
                    )}
                  />
                </Stack>

                <Stack component="section">
                  <AppTextInputNext<FormSchema>
                    name="additionalAddress"
                    label="Complément d’adresse"
                    mapValue={(value): string => value ?? ''}
                    contramapValue={(value): string | null => value || null}
                  />
                </Stack>

                <Grid container component="section" columnSpacing="1rem">
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AppTextInputNext<FormSchema>
                      name="email"
                      label="Adresse e-mail"
                      nativeInputProps={{
                        type: 'email',
                        inputMode: 'email'
                      }}
                      mapValue={(value): string => value ?? ''}
                      contramapValue={(value): string | null => value || null}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AppTextInputNext<FormSchema>
                      name="phone"
                      label="Numéro de téléphone"
                      nativeInputProps={{
                        type: 'tel',
                        inputMode: 'tel'
                      }}
                      mapValue={(value): string => value ?? ''}
                      contramapValue={(value): string | null => value || null}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </modal.Component>
          </form>
        </FormProvider>
      );
    }
  };
}

export default createOwnerEditionModalNext;
