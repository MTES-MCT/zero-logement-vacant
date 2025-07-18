import { useEffect, useState } from 'react';
import * as yup from 'yup';

import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { Group } from '../../../models/Group';
import { useForm } from '../../../hooks/useForm';
import AppInfo from '../../_app/AppInfo/AppInfo';
import HousingCount from '../../HousingCount/HousingCount';
import { Col, Row } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { GroupPayload } from '../../../models/GroupPayload';

interface Props {
  title: string;
  housingCount?: number;
  modalId?: string;
  openingButtonProps?: Omit<
    Exclude<ButtonProps, ButtonProps.AsAnchor>,
    'onClick'
  >;
  group?: Partial<
    Pick<Group, 'title' | 'description' | 'housingCount' | 'ownerCount'>
  >;
  onSubmit: (group: GroupPayload) => void;
}

function GroupEditionModal(props: Props) {
  const modalId = props.modalId ?? 'group-edition-modal';
  const [title, setTitle] = useState(props.group?.title ?? '');
  const [description, setDescription] = useState(
    props.group?.description ?? ''
  );

  useEffect(() => {
    if (props.group?.title) {
      setTitle(props.group.title);
    }
    if (props.group?.description) {
      setDescription(props.group.description);
    }
  }, [props.group]);

  const shape = {
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
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    title,
    description
  });

  async function onSubmit(): Promise<void> {
    await form.validate(() =>
      props.onSubmit({
        title,
        description
      })
    );
  }

  const housingCount = props.group?.housingCount ?? 0;
  const ownerCount = props.group?.ownerCount ?? 0;

  return (
    <ConfirmationModal
      modalId={modalId}
      openingButtonProps={{
        children: 'Créer un nouveau groupe',
        iconId: 'fr-icon-add-line',
        iconPosition: 'left',
        size: 'small',
        priority: 'secondary',
        ...props.openingButtonProps
      }}
      size="large"
      title={props.title}
      onSubmit={onSubmit}
    >
      {housingCount > 0 && ownerCount > 0 && (
        <HousingCount housingCount={housingCount} ownerCount={ownerCount} />
      )}
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
              Vous pouvez par exemple définir à quoi sert ce groupe et comment
              vous l’avez construit
            </AppInfo>
          </Col>
        </Row>
      </form>
    </ConfirmationModal>
  );
}

export default GroupEditionModal;
