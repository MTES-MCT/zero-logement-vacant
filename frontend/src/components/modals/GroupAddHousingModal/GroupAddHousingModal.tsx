import { Button, Container, Select, Text } from '@dataesr/react-dsfr';

import { Group } from '../../../models/Group';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import React, { useState } from 'react';
import { useFindGroupsQuery } from '../../../services/group.service';
import { SelectOption } from '../../../models/SelectOption';
import styles from './group-add-housing-modal.module.scss';

interface Props {
  open: boolean;
  onSubmit: (group: Group) => void;
  onClose: () => void;
  onGroupCreate: () => void;
}

function GroupAddHousingModal(props: Props) {
  const [selected, setSelected] = useState<Group['id']>();
  const { data: groups } = useFindGroupsQuery();

  const options: SelectOption[] = [
    {
      label: 'Sélectionnez un groupe existant',
      value: '',
      hidden: true,
    },
    ...(groups ?? []).map((group) => ({
      label: group.title,
      value: group.id,
    })),
  ];

  function submit(): void {
    const group = groups?.find((group) => group.id === selected);
    if (group) {
      props.onSubmit?.(group);
    }
  }

  if (!props.open) {
    return <></>;
  }

  return (
    <ConfirmationModal
      alignFooter="right"
      icon=""
      size="lg"
      title="Ajouter dans un groupe existant"
      onSubmit={submit}
      onClose={props.onClose}
    >
      <Container as="main" fluid className={styles.container}>
        <Select
          label="Ajoutez votre sélection à un groupe existant"
          options={options}
          selected={selected}
          onChange={(e) => setSelected(e.target.value)}
          required
        />
        <Text as="span" className={styles.divider}>
          ou
        </Text>
        <Button
          secondary
          onClick={props.onGroupCreate}
          className={styles.center}
        >
          Créer un nouveau groupe
        </Button>
      </Container>
    </ConfirmationModal>
  );
}

export default GroupAddHousingModal;
