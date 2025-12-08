import Alert from '@codegouvfr/react-dsfr/Alert';
import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { object, string, type InferType } from 'yup';

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
        resolver: yupResolver(schema)
      });

      const [getHousing, getHousingQuery] = housingApi.useLazyGetHousingQuery();
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
        await Promise.all([
          getDatafoncierHousing(data.localId)
            .unwrap()
            .catch((error) => {
              form.setError('localId', {
                type: 'manual',
                message:
                  'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies. Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement. Le format de l’identifiant national n’est pas valide. Exemple de format valide : 331234567891'
              });
              throw error;
            }),
          getHousing(data.localId)
            .unwrap()
            .then((housing) => {
              if (housing) {
                form.setError('localId', {
                  type: 'manual',
                  message: 'Ce logement existe déjà dans votre parc'
                });
                throw new Error('HousingExistsError');
              }
            })
            .catch((err) => {
              const error = unwrapError(err);
              if (error?.name === 'HousingMissingError') {
                // Ignore the error because we want to know whether the housing exists
                return;
              }
              throw error;
            })
        ])
          .then(() => {
            props.onNext(data.localId);
          })
          .catch(() => {
            // Ignore
          });
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
