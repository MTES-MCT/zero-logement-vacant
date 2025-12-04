import { fr } from '@codegouvfr/react-dsfr';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext } from 'react-hook-form';
import * as yup from 'yup';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import OwnerAddressEditionNext from '~/components/Owner/OwnerAddressEditionNext';
import Icon from '~/components/ui/Icon';
import type { Owner } from '~/models/Owner';

const PHONE_REGEXP = /^(\+33|0)[1-9][0-9]{8}$/;

export const OWNER_FORM_FIELD_SCHEMA = yup.object({
  fullName: yup.string().required(
    'Veuillez saisir le nom et prénom du propriétaire'
  ),
  birthDate: yup.string().defined().nullable(),
  banAddress: yup.object({
    id: yup.string().required(),
    label: yup.string().required(),
    score: yup.number().required().min(0).max(1),
    longitude: yup.number().min(-180).max(180).required(),
    latitude: yup.number().min(-90).max(90).required()
  })
    .defined()
    .nullable(),
  additionalAddress: yup.string().defined().nullable(),
  email: yup.string()
    .email('Email invalide. Exemple de format valide : exemple@gmail.com')
    .defined()
    .nullable(),
  phone: yup.string()
    .matches(
      PHONE_REGEXP,
      'Téléphone invalide. Exemple de format valide : +33XXXXXXXXX ou 0XXXXXXXXX'
    )
    .defined()
    .nullable()
});

export type OwnerFormFieldsSchema = yup.InferType<typeof OWNER_FORM_FIELD_SCHEMA>;

export interface OwnerFormFieldsProps {
  owner: Owner;
}

function OwnerFormFields(props: OwnerFormFieldsProps) {
  const form = useFormContext<OwnerFormFieldsSchema>();

  return (
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
          <AppTextInputNext<OwnerFormFieldsSchema['birthDate']>
            name="birthDate"
            label="Date de naissance"
            nativeInputProps={{
              type: 'date',
              max: new Date().toISOString().substring(0, 'yyyy-mm-dd'.length)
            }}
            mapValue={(value): string => value ?? ''}
            contramapValue={(value): string | null => value || null}
          />
        </Grid>
      </Grid>

      <Stack component="section">
        <Stack direction="row" spacing="0.25rem" sx={{ alignItems: 'center' }}>
          <Icon name="fr-icon-bank-line" size="sm" />
          <Typography color={fr.colors.decisions.text.active.grey.default}>
            Adresse fiscale (source: DGFIP)
          </Typography>
        </Stack>
        <Typography className="fr-hint-text">
          Adresse issue des fichiers LOVAC (non modifiable).
        </Typography>
        <Typography
          color={fr.colors.decisions.text.mention.grey.default}
          sx={{ mt: '0.25rem', fontWeight: 500 }}
        >
          {props.owner.rawAddress
            ? props.owner.rawAddress.join(' ')
            : 'Inconnue'}
        </Typography>
      </Stack>

      <Stack component="section">
        <Controller
          control={form.control}
          name="banAddress"
          render={({ field, fieldState }) => (
            <OwnerAddressEditionNext
              disabled={field.disabled}
              error={fieldState.error?.message}
              address={
                field.value
                  ? {
                      ...field.value,
                      banId: field.value.id,
                      postalCode: '',
                      city: ''
                    }
                  : null
              }
              onChange={(address) => {
                field.onChange(
                  address &&
                    address.banId &&
                    address.latitude &&
                    address.longitude &&
                    address.score
                    ? ({
                        id: address.banId,
                        label: address.label,
                        score: address.score,
                        longitude: address.longitude,
                        latitude: address.latitude
                      } satisfies OwnerFormFieldsSchema['banAddress'])
                    : null
                );
              }}
            />
          )}
        />
      </Stack>

      <Stack component="section">
        <AppTextInputNext<OwnerFormFieldsSchema['additionalAddress']>
          name="additionalAddress"
          label="Complément d'adresse"
          mapValue={(value): string => value ?? ''}
          contramapValue={(value): string | null => value || null}
        />
      </Stack>

      <Grid container component="section" columnSpacing="1rem">
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<OwnerFormFieldsSchema['email']>
            name="email"
            label="Adresse e-mail"
            nativeInputProps={{
              type: 'email',
              autoComplete: 'email'
            }}
            mapValue={(value): string => value ?? ''}
            contramapValue={(value): string | null => value || null}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<OwnerFormFieldsSchema['phone']>
            name="phone"
            label="Numéro de téléphone"
            nativeInputProps={{
              type: 'tel',
              autoComplete: 'tel'
            }}
            mapValue={(value): string => value ?? ''}
            contramapValue={(value): string | null => value || null}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

export default OwnerFormFields;
