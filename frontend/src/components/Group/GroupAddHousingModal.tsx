import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import { styled } from '@mui/material/styles';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { createConfirmationModal } from '../modals/ConfirmationModal/ConfirmationModalNext';
import { useFindGroupsQuery } from '../../services/group.service';
import AppSelectNext, { Option } from '../_app/AppSelect/AppSelectNext';
import { Group } from '../../models/Group';

interface GroupAddHousingModalProps {
  onNewGroup(): void;
}

const schema = yup.object({
  group: yup.string().uuid().nullable()
});

function createGroupAddHousingModal() {
  const modal = createConfirmationModal({
    id: 'group-add-housing',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: GroupAddHousingModalProps) {
      const { data } = useFindGroupsQuery();
      const options: ReadonlyArray<Option<Group['id']>> =
        data
          ?.filter((group) => !group.archivedAt)
          ?.map((group) => ({
            label: group.title,
            value: group.id
          })) ?? [];

      const form = useForm<yup.InferType<typeof schema>>({
        defaultValues: {
          group: null
        },
        mode: 'onSubmit',
        resolver: yupResolver(schema)
      });

      return (
        <modal.Component
          size="large"
          title="Ajouter dans un groupe de logements"
        >
          <FormProvider {...form}>
            Ajoutez votre sélection à un groupe existant
            <AppSelectNext name="groups" options={options} />
          </FormProvider>
          <Divider>OU</Divider>
          <Button
            iconId="fr-icon-add-line"
            priority="secondary"
            size="small"
            onClick={() => {
              props.onNewGroup();
            }}
            data-testid="create-new-group"
          >
            Créer un nouveau groupe
          </Button>
        </modal.Component>
      );
    }
  };
}

const Divider = styled('div')({
  display: 'flex',
  alignItems: 'center',
  textTransform: 'uppercase',
  color: fr.colors.decisions.text.mention.grey.default,

  '&::before, &::after': {
    content: '""',
    height: '1px',
    backgroundColor: fr.colors.decisions.border.plain.grey.default,
    flexGrow: 1,
    margin: '0 1rem'
  }
});

export default createGroupAddHousingModal;
