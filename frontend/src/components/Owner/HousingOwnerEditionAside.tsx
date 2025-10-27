import { fr } from '@codegouvfr/react-dsfr';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import { yupResolver } from '@hookform/resolvers-next/yup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  DECEASED_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { boolean, number, object, string, type InferType } from 'yup-next';

import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';
import Box from '@mui/material/Box';
import { match, Pattern } from 'ts-pattern';
import Aside, { type AsideProps } from '~/components/Aside/AsideNext';
import type { HousingOwner } from '~/models/Owner';
import HousingOwnerInactiveSelect from './HousingOwnerInactiveSelect';
import OwnerFormFields, { OWNER_FORM_FIELD_SCHEMA } from './OwnerFormFields';

const schema = object({
  isActive: boolean().required(),
  rank: string()
    .oneOf(['primary', 'secondary'])
    .nullable()
    .when('isActive', {
      is: true,
      then: (schema) =>
        schema.required('Veuillez sélectionner un rang de contact'),
      otherwise: (schema) => schema.nullable()
    }),
  inactiveRank: number()
    .oneOf([
      DECEASED_OWNER_RANK,
      INCORRECT_OWNER_RANK,
      PREVIOUS_OWNER_RANK
    ])
    .nullable()
    .when('isActive', {
      is: false,
      then: (schema) =>
        schema.required('Veuillez sélectionner un état du propriétaire'),
      otherwise: (schema) => schema.nullable()
    })
})
  .concat(OWNER_FORM_FIELD_SCHEMA)
  .required();

export type HousingOwnerEditionSchema = InferType<typeof schema>;

export type HousingOwnerEditionAsideProps = Pick<
  AsideProps,
  'open' | 'onClose'
> & {
  housingOwner: HousingOwner | null;
  onSave(payload: HousingOwnerEditionSchema): void;
};

function HousingOwnerEditionAside(props: HousingOwnerEditionAsideProps) {
  const { housingOwner } = props;

  const form = useForm<HousingOwnerEditionSchema>({
    values: {
      rank: match(housingOwner?.rank)
        .returnType<'primary' | 'secondary' | null>()
        .with(1, () => 'primary')
        .with(Pattern.number.int().gte(2), () => 'secondary')
        .otherwise(() => null),
      isActive: housingOwner?.rank !== undefined && housingOwner.rank >= 1,
      inactiveRank: match(housingOwner?.rank)
        .with(
          DECEASED_OWNER_RANK,
          INCORRECT_OWNER_RANK,
          PREVIOUS_OWNER_RANK,
          (rank) => rank
        )
        .otherwise(() => null),
      fullName: housingOwner?.fullName ?? '',
      birthDate: housingOwner?.birthDate ?? null,
      banAddress:
        housingOwner?.banAddress &&
        housingOwner.banAddress.banId &&
        housingOwner.banAddress.score &&
        housingOwner.banAddress.latitude &&
        housingOwner.banAddress.longitude
          ? {
              id: housingOwner.banAddress.banId,
              label: housingOwner.banAddress.label,
              score: housingOwner.banAddress.score,
              longitude: housingOwner.banAddress.longitude,
              latitude: housingOwner.banAddress.latitude
            }
          : null,
      additionalAddress: housingOwner?.additionalAddress ?? null,
      email: housingOwner?.email ?? null,
      phone: housingOwner?.phone ?? null
    },
    // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
    resolver: yupResolver(schema)
  });

  // The original rank found in the fiscal data
  const sourceRank: string | null = match(
    Number(housingOwner?.idprodroit?.substring(-1))
  )
    .returnType<string | null>()
    .with(1, () => '1er')
    .with(Pattern.number.int().gte(2), (n) => `${n}ème`)
    .otherwise(() => null);

  const { isDirty } = form.formState;
  const isActiveValue = form.watch('isActive');

  function onClose() {
    props.onClose();
    if (isDirty) {
      form.reset();
    }
  }

  function onSubmit(payload: HousingOwnerEditionSchema) {
    if (!isDirty || !housingOwner) {
      onClose();
      return;
    }

    props.onSave({
      isActive: payload.isActive,
      additionalAddress: payload.additionalAddress,
      banAddress: payload.banAddress,
      birthDate: payload.birthDate,
      email: payload.email,
      fullName: payload.fullName,
      phone: payload.phone,
      rank: payload.rank,
      inactiveRank: payload.inactiveRank
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Aside
          open={props.open}
          width="40rem"
          drawerProps={{
            sx: (theme) => ({
              zIndex: theme.zIndex.appBar + 1,
              '& .MuiDrawer-paper': {
                px: '1.5rem',
                py: '2rem'
              }
            })
          }}
          header={
            <Typography component="h2" variant="h6">
              Éditer les informations du propriétaire
            </Typography>
          }
          main={
            !housingOwner ? null : (
              <Stack spacing="1.5rem">
                <Stack
                  component="section"
                  spacing="0.5rem"
                  useFlexGap
                  sx={{
                    border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
                    padding: '1rem'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Statut du propriétaire
                  </Typography>

                  <Box sx={{ pt: '1rem', pb: '1.5rem' }}>
                    <Controller
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <ToggleSwitch
                          checked={field.value}
                          label="Actuellement propriétaire"
                          onChange={(checked) => {
                            field.onChange(checked);
                          }}
                        />
                      )}
                    />
                  </Box>

                  {isActiveValue ? (
                    <Stack component="section">
                      <Typography sx={{ mb: '0.25rem' }}>
                        Rang de contact
                      </Typography>
                      {sourceRank === null ? null : (
                        <Typography
                          sx={{
                            color: fr.colors.decisions.text.mention.grey.default
                          }}
                        >
                          Ce propriétaire a été indiqué comme {sourceRank} dans
                          le rang de propriété de ce logement dans la donnée
                          fiscale initiale.
                        </Typography>
                      )}
                      <Controller
                        control={form.control}
                        name="rank"
                        render={({ field, fieldState }) => (
                          <RadioButtons
                            className={fr.cx('fr-mt-3v')}
                            state={fieldState.invalid ? 'error' : 'default'}
                            stateRelatedMessage={fieldState.error?.message}
                            disabled={field.disabled}
                            options={[
                              {
                                label: 'Destinataire principal',
                                nativeInputProps: {
                                  checked: field.value === 'primary',
                                  onChange: () => field.onChange('primary')
                                }
                              },
                              {
                                label: 'Destinataire secondaire',
                                nativeInputProps: {
                                  checked: field.value === 'secondary',
                                  onChange: () => field.onChange('secondary')
                                }
                              }
                            ]}
                          />
                        )}
                      />
                    </Stack>
                  ) : (
                    <Controller
                      control={form.control}
                      name="inactiveRank"
                      render={({ field, fieldState }) => (
                        <HousingOwnerInactiveSelect
                          error={fieldState.error?.message}
                          // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  )}
                </Stack>

                <OwnerFormFields owner={housingOwner} />
              </Stack>
            )
          }
          onClose={onClose}
          onSave={form.handleSubmit(onSubmit)}
        />
      </form>
    </FormProvider>
  );
}

export default HousingOwnerEditionAside;
