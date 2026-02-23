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
    banId: string().optional(),
    label: string().required(),
    houseNumber: string().optional(),
    street: string().optional(),
    postalCode: string().required(),
    city: string().required(),
    latitude: number().optional(),
    longitude: number().optional(),
    score: number().optional()
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
      address: props.owner?.banAddress ? {
        banId: props.owner.banAddress.banId,
        label: props.owner.banAddress.label,
        city: props.owner.banAddress.city,
        houseNumber: props.owner.banAddress.houseNumber,
        postalCode: props.owner.banAddress.postalCode,
        street: props.owner.banAddress.street,
        latitude: props.owner.banAddress.latitude,
        longitude: props.owner.banAddress.longitude,
        score: props.owner.banAddress.score,
      } : null,
      additionalAddress: props.owner?.additionalAddress ?? ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  /* DEPRECATED */
  const [updateOwner, mutation] = useUpdateOwnerMutation();

  async function save(values: OwnerEditionFormSchema): Promise<void> {
    if (props.owner) {
      // Prevent submission if user cleared the address by typing without selecting
      if (props.owner.banAddress && !values.address) {
        form.setError('address', {
          type: 'manual',
          message: "Veuillez sélectionner une adresse depuis la liste de suggestions."
        });
        return;
      }

      localStorage.setItem(
        'OwnerEdition.warningVisible',
        warningVisible.toString()
      );
      await updateOwner({
        ...props.owner,
        banAddress: values.address ? {
          label: values.address.label,
          score: values.address.score ?? undefined,
          banId: values.address.banId ?? undefined,
          houseNumber: values.address.houseNumber ?? undefined,
          street: values.address.street ?? undefined,
          postalCode: values.address.postalCode ?? '',
          city: values.address.city ?? '',
          latitude: values.address.latitude ?? undefined,
          longitude: values.address.longitude ?? undefined
        } : null,
        additionalAddress: values.additionalAddress
      })
        .unwrap()
        .then(() => {
          props.onClose?.();
        })
        .catch((error: { data?: { message?: string } }) => {
          const message = error?.data?.message;
          if (message && message.toLowerCase().includes('adresse')) {
            form.setError('address', {
              type: 'server',
              message
            });
          }
        });
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
          Éditer les informations du propriétaire
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
                <a
                  className={fr.cx('fr-link--sm')}
                  href="https://zerologementvacant.crisp.help/fr/article/comment-choisir-entre-ladresse-ban-et-ladresse-lovac-1ivvuep/?bust=1705403706774"
                  rel="noreferrer"
                  target="_blank"
                >
                  Je ne trouve pas l&apos;adresse dans la liste
                </a>
                <Controller<OwnerEditionFormSchema, 'address'>
                  name="address"
                  render={({ field, fieldState }) => (
                    <OwnerAddressEdition
                      banAddress={field.value ? {
                        label: field.value.label,
                        score: field.value.score ?? undefined,
                        banId: field.value.banId ?? undefined,
                        houseNumber: field.value.houseNumber ?? undefined,
                        street: field.value.street ?? undefined,
                        postalCode: field.value.postalCode ?? '',
                        city: field.value.city ?? '',
                        latitude: field.value.latitude ?? undefined,
                        longitude: field.value.longitude ?? undefined
                      } : undefined}
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
