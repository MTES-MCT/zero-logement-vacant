import { Col, Container, Row, Select, Text } from '../../_dsfr';

import { Group } from '../../../models/Group';
import React, { ChangeEvent, useState } from 'react';
import { useFindGroupsQuery } from '../../../services/group.service';
import { SelectOption } from '../../../models/SelectOption';
import styles from './group-add-housing-modal.module.scss';
import { GroupPayload } from '../../../models/GroupPayload';
import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import AppInfo from '../../_app/AppInfo/AppInfo';
import * as yup from 'yup';
import { useForm } from '../../../hooks/useForm';

interface Props {
  className?: string;
  housingCount?: number;
  onGroupSelect: (group: Group) => void;
  onGroupCreate: (payload: GroupPayload) => void;
}

const modal = createModal({
  id: 'group-add-housing-modal',
  isOpenedByDefault: false,
});

function GroupAddHousingModal(props: Props) {
  const { data } = useFindGroupsQuery();
  const groups = (data ?? []).filter((group) => !group.archivedAt);

  const [mode, setMode] = useState<Mode>('default');

  const [selected, setSelected] = useState<Group['id']>();
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
  const defaultContent: Content = {
    title: 'Ajouter dans un groupe existant',
    buttons: [
      {
        children: 'Annuler',
        priority: 'secondary',
        className: 'fr-mr-2w',
      },
      {
        children: 'Confirmer',
        doClosesModal: false,
        onClick: function (): void {
          const group = groups?.find((group) => group.id === selected);
          if (group) {
            props.onGroupSelect?.(group);
          }
        },
      },
    ],
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const shape = {
    title: yup
      .string()
      .required('Veuillez donner un nom au groupe pour confirmer'),
    description: yup
      .string()
      .required('Veuillez donner une description au groupe pour confirmer'),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    title,
    description,
  });

  const createGroupContent: Content = {
    title: 'Création d’un nouveau groupe de logements',
    buttons: [
      {
        children: 'Annuler',
        priority: 'secondary',
        className: 'fr-mr-2w',
      },
      {
        children: 'Confirmer',
        doClosesModal: false,
        onClick: async () => {
          await form.validate(() => {
            props.onGroupCreate({
              title,
              description,
            });
          });
        },
      },
    ],
  };

  const content = mode === 'default' ? defaultContent : createGroupContent;

  return (
    <>
      <Button
        className={props.className}
        priority="secondary"
        onClick={() => {
          setMode('default');
          modal.open();
        }}
      >
        Ajouter dans un groupe
      </Button>
      <modal.Component
        size="large"
        title={content.title}
        buttons={content.buttons}
        style={{ textAlign: 'initial' }}
      >
        <Container as="section" fluid>
          {mode === 'default' ? (
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
              <Button
                iconId="fr-icon-add-line"
                priority="secondary"
                size="small"
                className={styles.center}
                onClick={() => setMode('createContent')}
              >
                Créer un nouveau groupe
              </Button>
            </Container>
          ) : (
            <Container as="main" fluid className={styles.container}>
              <form id="group-edition-form">
                <Row gutters>
                  <Col>
                    <AppTextInput<FormShape>
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      label="Nom du groupe"
                      inputForm={form}
                      inputKey="title"
                      required
                    />
                    <AppTextInput<FormShape>
                      value={description}
                      textArea
                      onChange={(e) => setDescription(e.target.value)}
                      label="Description"
                      inputForm={form}
                      inputKey="description"
                      required
                    />
                    <AppInfo>
                      Vous pouvez par exemple définir à quoi sert ce groupe et
                      comment vous l’avez construit
                    </AppInfo>
                  </Col>
                </Row>
              </form>
            </Container>
          )}
        </Container>
      </modal.Component>
    </>
  );
}

interface Content {
  title: string;
  buttons: ModalProps['buttons'];
}

type Mode = 'default' | 'createContent';

export default GroupAddHousingModal;
