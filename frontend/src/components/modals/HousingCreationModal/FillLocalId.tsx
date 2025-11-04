import Alert from '@codegouvfr/react-dsfr/Alert';
import { yupResolver } from '@hookform/resolvers-next/yup';
import Grid from '@mui/material/Grid';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { object, string, type InferType } from 'yup-next';

import { datafoncierApi } from '~/services/datafoncier.service';
import { housingApi } from '~/services/housing.service';
import { unwrapError } from '~/store/store';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { createExtendedModal } from '~/components/modals/ConfirmationModal/ExtendedModal';

const schema = object({
  localId: string()
    .required('Veuillez renseigner un identifiant pour ce logement')
    .trim()
    .length(12, 'L’identifiant doit contenir exactement 12 caractères')
}).required();

type FillLocalIdSchema = InferType<typeof schema>;

export interface FillLocalIdProps {
  onCancel(): void;
  onNext(localId: string): void;
}

function createFillLocalIdModal() {
  const modal = createExtendedModal({
    id: 'fill-local-id-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: FillLocalIdProps) {
      const form = useForm<FillLocalIdSchema>({
        defaultValues: {
          localId: ''
        },
        // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
        resolver: yupResolver(schema)
      });

      const [getHousing, getHousingQuery] = housingApi.useLazyGetHousingQuery();
      const { currentData: housing } = getHousingQuery;
      const [getDatafoncierHousing, getDatafoncierHousingQuery] =
        datafoncierApi.useLazyFindOneHousingQuery();

      useEffect(() => {
        const subscription = form.watch(() => {
          form.clearErrors('localId');
        });
        return () => subscription.unsubscribe();
      }, [form]);

      function cancel() {
        form.reset();
        props.onCancel();
      }

      async function next(data: FillLocalIdSchema) {
        try {
          await Promise.all([
            getDatafoncierHousing(data.localId).unwrap(),
            getHousing(data.localId)
              .unwrap()
              .catch((err) => {
                const error = unwrapError(err);
                if (error?.name === 'HousingMissingError') {
                  return;
                }
                throw error;
              })
              .then((housing) => {
                if (housing) {
                  throw new Error('HousingExistsError');
                }
              })
          ]);

          props.onNext(data.localId);
        } catch {
          if (housing) {
            form.setError('localId', {
              type: 'manual',
              message: 'Ce logement existe déjà dans votre parc'
            });
          } else if (
            unwrapError(getDatafoncierHousingQuery.error)?.name ===
            'HousingMissingError'
          ) {
            form.setError('localId', {
              type: 'manual',
              message:
                'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies. Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement.'
            });
          }
        }
      }

      return (
        <FormProvider {...form}>
          <form id="housing-creation-form" onSubmit={form.handleSubmit(next)}>
            <modal.Component
              title="Ajouter un logement"
              size="large"
              buttons={[
                {
                  children: 'Annuler',
                  priority: 'secondary',
                  doClosesModal: false,
                  onClick: cancel
                },
                {
                  children: 'Suivant',
                  doClosesModal: false,
                  disabled:
                    getHousingQuery.isLoading ||
                    getDatafoncierHousingQuery.isLoading,
                  onClick: form.handleSubmit(next)
                }
              ]}
            >
              <Alert
                className="fr-mb-2w"
                severity="info"
                title="Comment trouver l’identifiant fiscal national ?"
                description={
                  <>
                    <a
                      href="https://doc-datafoncier.cerema.fr/doc/ff/pb0010_local/idlocal"
                      target="_blank"
                      rel="noreferrer"
                    >
                      L&apos;identifiant fiscal national
                    </a>
                    &nbsp;(12 chiffres), présent dans les Fichiers Fonciers, est
                    une concaténation du&nbsp;
                    <a
                      href="https://doc-datafoncier.cerema.fr/doc/dv3f/local/coddep"
                      target="_blank"
                      rel="noreferrer"
                    >
                      &nbsp;code département
                    </a>
                    &nbsp;(2 chiffres) et de&nbsp;
                    <a
                      href="https://doc-datafoncier.cerema.fr/doc/ff/pb0010_local/invar"
                      target="_blank"
                      rel="noreferrer"
                    >
                      l&apos;invariant fiscal départemental
                    </a>
                    &nbsp;(10 chiffres) du logement, dans cet ordre-là.
                  </>
                }
              />

              <Grid container>
                <Grid size={8}>
                  <AppTextInputNext
                    name="localId"
                    label="Saisissez l’identifiant fiscal national (obligatoire)"
                    nativeInputProps={{
                      required: true
                    }}
                  />
                </Grid>
              </Grid>
            </modal.Component>
          </form>
        </FormProvider>
      );
    }
  };
}

export default createFillLocalIdModal;
