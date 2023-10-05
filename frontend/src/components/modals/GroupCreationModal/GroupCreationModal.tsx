import React, { ChangeEvent, useState } from 'react';
import { Col, Row } from '@dataesr/react-dsfr';

import * as yup from 'yup';

import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { Group } from '../../../models/Group';
import { useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';
import HousingCount from '../../HousingCount/HousingCount';
import Info from '../../Info/Info';

interface Props {
  open: boolean;
  housingCount?: number;
  ownerCount?: number;
  onSubmit: (group: Pick<Group, 'title' | 'description'>) => void;
  onClose: () => void;
}

function GroupCreationModal(props: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const shape = {
    title: yup
      .string()
      .required('Veuillez donner un nom au groupe pour confirmer'),
    description: yup
      .string()
      .required('Veuillez donner une description pour confirmer'),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    title,
    description,
  });

  async function onSubmit(): Promise<void> {
    await form.validate(() => {
      props.onSubmit({
        title,
        description,
      });
    });
  }

  if (!props.open) {
    return <></>;
  }

  return (
    <ConfirmationModal
      alignFooter="right"
      icon=""
      size="lg"
      title="Création d’un nouveau groupe de logements"
      onSubmit={onSubmit}
      onClose={props.onClose}
    >
      {props.housingCount && props.ownerCount && (
        <HousingCount
          housingCount={props.housingCount}
          ownerCount={props.ownerCount}
        />
      )}
      <form id="group-creation-form">
        <Row gutters>
          <Col>
            <AppTextInput<FormShape>
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              label="Nom du groupe"
              inputForm={form}
              inputKey="title"
              required
            />
            <AppTextInput<FormShape>
              value={description}
              textarea
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              label="Description"
              inputForm={form}
              inputKey="description"
              required
            />
            <Info>
              Vous pouvez par exemple définir à quoi sert ce groupe et comment
              vous l’avez construit
            </Info>
          </Col>
        </Row>
      </form>
    </ConfirmationModal>
  );
}

export default GroupCreationModal;
