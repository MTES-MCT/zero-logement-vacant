import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { HousingCountDTO } from '@zerologementvacant/models';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { Group } from '../../models/Group';
import HousingCount from '../HousingCount/HousingCount';

type Payload = Pick<Group, 'title' | 'description'>;

export interface GroupCreationModalProps {
  count?: HousingCountDTO;
  isCounting: boolean;
  onBack(): void;
  onConfirm(payload: Payload): void;
}

const schema = yup.object({
  title: yup
    .string()
    .max(64, 'La longueur maximale du titre du groupe est de 64 caractères.')
    .required('Veuillez donner un nom au groupe pour confirmer'),
  description: yup
    .string()
    .max(
      1000,
      'La longueur maximale de la description du groupe est de 1000 caractères.'
    )
    .required('Veuillez donner une description au groupe pour confirmer')
});

function createGroupCreationModal() {
  const modal = createExtendedModal({
    id: 'group-creation',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: GroupCreationModalProps) {
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
                children: 'Créer un groupe',
                doClosesModal: false,
                onClick: form.handleSubmit(confirm)
              }
            ]}
            size="extra-large"
            title="Créer un nouveau groupe de logements"
          >
            <Grid sx={{ mt: -1, mb: 2 }} size={12}>
              {props.isCounting && (
                <Skeleton animation="wave" height="1.5rem" width="20rem" />
              )}
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
                  label="Nom du groupe (obligatoire)"
                  name="title"
                />
              </Grid>
            </Grid>
            <Grid container>
              <Grid size={8}>
                <AppTextInputNext
                  hintText="Vous pouvez par exemple définir à quoi sert ce groupe et comment vous l’avez construit."
                  label="Description du groupe (obligatoire)"
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

export default createGroupCreationModal;
