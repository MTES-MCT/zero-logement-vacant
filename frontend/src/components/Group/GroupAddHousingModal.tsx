import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Select, { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { yupResolver } from '@hookform/resolvers/yup';
import { styled } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Unstable_Grid2';
import { FormProvider, useController, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { HousingCountDTO } from '@zerologementvacant/models';
import { useFindGroupsQuery } from '../../services/group.service';
import { Group } from '../../models/Group';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import HousingCount from '../HousingCount/HousingCount';

interface GroupAddHousingModalProps {
  count?: HousingCountDTO;
  isCounting: boolean;
  onBack(): void;
  onExistingGroup(group: Group): void;
  onNewGroup(): void;
}

const schema = yup.object({
  group: yup
    .string()
    .required(
      'Veuillez sélectionner un groupe existant ou créer un nouveau groupe'
    )
    .uuid()
});

function createGroupAddHousingModal() {
  const modalOptions = {
    id: 'group-add-housing',
    isOpenedByDefault: false
  };
  const modal = createExtendedModal(modalOptions);

  return {
    ...modal,
    Component(props: GroupAddHousingModalProps) {
      const { data } = useFindGroupsQuery();
      const options: Array<SelectProps.Option<Group['id']>> =
        data
          ?.filter((group) => !group.archivedAt)
          ?.map((group) => ({
            label: group.title,
            value: group.id
          })) ?? [];

      const form = useForm<yup.InferType<typeof schema>>({
        defaultValues: {
          group: ''
        },
        mode: 'onSubmit',
        resolver: yupResolver(schema)
      });
      const { field: groupField, fieldState: groupFieldState } = useController({
        name: 'group',
        control: form.control
      });

      function submit(): void {
        const id = form.getValues('group');
        const group = data?.find((group) => group.id === id);
        if (group) {
          props.onExistingGroup(group);
        }
      }

      return (
        <FormProvider {...form}>
          <modal.Component
            buttons={[
              {
                children: 'Revenir en arrière',
                className: 'fr-mr-2w',
                priority: 'secondary',
                doClosesModal: false,
                onClick: props.onBack
              },
              {
                children: 'Confirmer',
                doClosesModal: false,
                onClick: form.handleSubmit(submit)
              }
            ]}
            size="extra-extra-large"
            title="Ajouter dans un groupe de logements"
          >
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

            <Grid container sx={{ justifyContent: 'center' }}>
              <Grid sx={{ display: 'flex', flexDirection: 'column' }} xs={8}>
                {/* Shall be replaced by <AppSelectNext>
            whenever we upgrade the DSFR to v1.13.0.
            A [bug](https://github.com/GouvernementFR/dsfr/pull/992)
            is present in the focus trap of the DSFR modal */}
                <Select
                  className="fr-mb-2w"
                  label="Ajoutez votre sélection à un groupe existant"
                  placeholder="Sélectionnez un groupe existant"
                  options={options}
                  state={groupFieldState.invalid ? 'error' : 'default'}
                  stateRelatedMessage={groupFieldState.error?.message}
                  nativeSelectProps={groupField}
                />
                <Divider>OU</Divider>
                <Button
                  className="fr-mt-2w"
                  iconId="fr-icon-add-line"
                  priority="secondary"
                  size="small"
                  style={{
                    alignSelf: 'center'
                  }}
                  onClick={() => {
                    props.onNewGroup();
                  }}
                >
                  Créer un nouveau groupe
                </Button>
              </Grid>
            </Grid>
          </modal.Component>
        </FormProvider>
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
