import { Container, Select, Text } from '../../_dsfr';

import { Group } from '../../../models/Group';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import React, { ChangeEvent, useState } from 'react';
import { useFindGroupsQuery } from '../../../services/group.service';
import { SelectOption } from '../../../models/SelectOption';
import styles from './group-add-housing-modal.module.scss';
import GroupEditionModal from '../GroupUpdateModal/GroupEditionModal';
import { GroupPayload } from '../../../models/GroupPayload';

interface Props {
  className?: string;
  housingCount?: number;
  onGroupSelect: (group: Group) => void;
  onGroupCreate: (payload: GroupPayload) => void;
}

function GroupAddHousingModal(props: Props) {
  const [selected, setSelected] = useState<Group['id']>();
  const { data } = useFindGroupsQuery();
  const groups = (data ?? []).filter((group) => !group.archivedAt);

  const options: SelectOption[] = [
    {
      label: 'Sélectionnez un groupe existant',
      value: '',
      hidden: true,
    },
    ...groups.map((group) => ({
      label: group.title,
      value: group.id,
    })),
  ];

  function selectGroup(): void {
    const group = groups?.find((group) => group.id === selected);
    if (group) {
      props.onGroupSelect?.(group);
    }
  }

  return (
    <ConfirmationModal
      modalId="group-add-housing-modal"
      size="large"
      title="Ajouter dans un groupe existant"
      openingButtonProps={{
        children: 'Ajouter dans un groupe',
        className: props.className,
        priority: 'secondary',
      }}
      onSubmit={selectGroup}
    >
      <Container as="main" fluid className={styles.container}>
        <Select
          label="Ajoutez votre sélection à un groupe existant"
          options={options}
          selected={selected}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setSelected(e.target.value)
          }
          required
        />
        <Text as="span" className={styles.divider}>
          ou
        </Text>
        <GroupEditionModal
          title="Création d’un nouveau groupe de logements"
          modalId="group-add-housing-new-group-modal"
          openingButtonProps={{
            style: { alignSelf: 'center' },
          }}
          housingCount={props.housingCount}
          onSubmit={props.onGroupCreate}
        />
      </Container>
    </ConfirmationModal>
  );
}

export default GroupAddHousingModal;
