import { fr } from '@codegouvfr/react-dsfr';
import { yupResolver } from '@hookform/resolvers/yup';
import { Grid, Typography } from '@mui/material';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { type InferType, number, object, string } from 'yup';

import { useNotification } from '../../hooks/useNotification';
import type { Owner } from '../../models/Owner';
import { useUpdateOwnerMutation } from '../../services/owner.service';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import AsideNext from '../Aside/AsideNext';
import OwnerAddressEdition from '../OwnerAddressEdition/OwnerAddressEdition';

interface OwnerEditionSideMenuProps {
  className?: string;
  owner: Owner | null;
  isOpen: boolean;
  onClose?(): void;
}

const WIDTH = '700px';
const schema = object({
  address: object({
    banId: string().defined().nullable(),
    label: string().required(),
    houseNumber: string().defined().nullable(),
    street: string().defined().nullable(),
    postalCode: string().defined().nullable(),
    city: string().defined().nullable(),
    latitude: number().defined().nullable(),
    longitude: number().defined().nullable(),
    score: number().defined().nullable()
  })
    .defined()
    .nullable(),
  additionalAddress: string().defined().nullable()
});
type OwnerEditionFormSchema = InferType<typeof schema>;

function OwnerEditionSideMenu(props: OwnerEditionSideMenuProps) {
  const storedWarningVisible = localStorage.getItem(
    'OwnerEdition.warningVisible'
  );
  const [warningVisible, setWarningVisible] = useState(
    storedWarningVisible === null || storedWarningVisible === 'true'
  );

  const form = useForm({
    values: {
      address: {
        banId: props.owner?.banAddress?.banId ?? '',
        label: props.owner?.banAddress?.label ?? '',
        city: props.owner?.banAddress?.city ?? '',
        houseNumber: props.owner?.banAddress?.houseNumber ?? '',
        postalCode: props.owner?.banAddress?.postalCode ?? '',
        street: props.owner?.banAddress?.street ?? '',
        latitude: props.owner?.banAddress?.latitude ?? 0,
        longitude: props.owner?.banAddress?.longitude ?? 0,
        score: props.owner?.banAddress?.score ?? 0,
      },
      additionalAddress: props.owner?.additionalAddress ?? ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  /* DEPRECATED */
  const [updateOwner, mutation] = useUpdateOwnerMutation();

  async function save(values: OwnerEditionFormSchema): Promise<void> {
    if (props.owner) {
      localStorage.setItem(
        'OwnerEdition.warningVisible',
        warningVisible.toString()
      );
      await updateOwner({
        ...props.owner,
        banAddress: values.address ?? null,
        additionalAddress: values.additionalAddress
      });
      props.onClose?.();
    }
  }

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'owner-edition'
  });

  return (
    <AsideNext
      drawerProps={{
        sx: (theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          '& .MuiDrawer-paper': {
            px: '1.5rem',
            py: '2rem',
            width: WIDTH
          }
        })
      }}
      header={
        <Typography component="h2" variant="h6">
          Modifier les informations du propriétaire
        </Typography>
      }
      main={
        props.owner === null ? null : (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(save)} className="fr-px-6w">
              <Grid container>
                <Typography
                  component="h3"
                  color={fr.colors.decisions.text.active.grey.default}
                >
                  <span
                    className={fr.cx(
                      'fr-icon-bank-line',
                      'fr-icon--sm',
                      'fr-mr-1w'
                    )}
                    aria-hidden={true}
                  />
                  Adresse fiscale (source: DGFIP)
                </Typography>
                <Grid>
                  <span className="fr-hint-text">
                    Cette adresse est issue du fichier LOVAC, récupérée via le
                    fichier 1767BIS-COM. Celle-ci n’est pas modifiable.
                  </span>
                  <Typography
                    color={fr.colors.decisions.text.default.grey.default}
                  >
                    {props.owner.rawAddress
                      ? props.owner.rawAddress.join(' ')
                      : 'Inconnue'}
                  </Typography>
                </Grid>
              </Grid>
              <section className="fr-mb-3w fr-mt-3w">
                <Typography
                  component="h3"
                  color={fr.colors.decisions.text.active.grey.default}
                >
                  <span
                    className={fr.cx(
                      'fr-icon-home-4-line',
                      'fr-icon--sm',
                      'fr-mr-1w'
                    )}
                    aria-hidden={true}
                  />
                  Adresse postale (source: Base Adresse Nationale)
                </Typography>
                <Controller<OwnerEditionFormSchema, 'address'>
                  name="address"
                  render={({ field, fieldState }) => (
                    <OwnerAddressEdition
                      banAddress={field.value ?? undefined}
                      disabled={field.disabled}
                      errorMessage={fieldState.error?.message}
                      help={false}
                      onSelectAddress={field.onChange}
                      warningVisible={warningVisible}
                      setWarningVisible={setWarningVisible}
                    />
                  )}
                />
              </section>
              <AppTextInputNext
                name="additionalAddress"
                label="Complément d’adresse"
              />
            </form>
          </FormProvider>
        )
      }
      open={props.isOpen}
      onClose={() => props.onClose?.()}
      onSave={form.handleSubmit(save)}
    />
  );
}

export default OwnerEditionSideMenu;
