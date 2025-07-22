import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { HousingCountDTO } from '@zerologementvacant/models';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { Group } from '../../models/Group';
import HousingCount from '../HousingCount/HousingCount';

type Payload = Pick<Group, 'title' | 'description'>;

export interface CampaignCreationModalProps {
  count?: HousingCountDTO;
  onBack(): void;
  onConfirm(payload: Payload): void;
}

const schema = yup.object({
  title: yup
    .string()
    .max(64, 'La longueur maximale du titre est de 64 caractères.')
    .required('Veuillez donner un nom à la campagne pour confirmer.'),
  description: yup
    .string()
    .max(1000, 'La longueur maximale de la description est de 1000 caractères.')
    .required('Veuillez donner une description à la campagne pour confirmer.')
});

function createCampaignCreationModal() {
  const modal = createExtendedModal({
    id: 'campaign-creation',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: CampaignCreationModalProps) {
      const form = useForm({
        defaultValues: {
          title: '',
          description: ''
        },
        mode: 'onSubmit',
        resolver: yupResolver(schema)
      });

      function back() {
        props.onBack();
      }

      function confirm() {
        props.onConfirm(form.getValues());
      }

      return (
        <FormProvider {...form}>
          <modal.Component
            buttons={[
              {
                children: 'Revenir en arrière',
                doClosesModal: false,
                priority: 'secondary',
                onClick: back
              },
              {
                children: 'Créer une campagne',
                doClosesModal: false,
                onClick: form.handleSubmit(confirm)
              }
            ]}
            size="extra-large"
            title="Créer une campagne"
          >
            <Grid sx={{ mt: -1, mb: 2 }} size={12}>
              {props.count && (
                <HousingCount
                  housingCount={props.count.housing}
                  ownerCount={props.count.owners}
                  suffix
                />
              )}
            </Grid>

            <Grid container sx={{ mb: 2 }}>
              <Grid size={5}>
                <AppTextInputNext
                  label="Titre de la campagne (obligatoire)"
                  name="title"
                />
              </Grid>
            </Grid>
            <Grid container>
              <Grid size={8}>
                <AppTextInputNext
                  hintText="Vous pouvez par exemple définir les critères de votre campagne, comment vous l’avez construite, le planning de celle-ci, etc."
                  label="Description (obligatoire)"
                  name="description"
                  textArea
                />
              </Grid>
            </Grid>
          </modal.Component>
        </FormProvider>
      );
    }
  };
}

export default createCampaignCreationModal;
