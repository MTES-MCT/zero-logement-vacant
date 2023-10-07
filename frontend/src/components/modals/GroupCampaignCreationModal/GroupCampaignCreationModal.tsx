import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import * as yup from 'yup';
import React, { ChangeEvent, useState } from 'react';
import { campaignTitleValidator, useForm } from '../../../hooks/useForm';
import { Campaign } from '../../../models/Campaign';
import { Group } from '../../../models/Group';
import { Container, Text } from '@dataesr/react-dsfr';
import Alert from '../../Alert/Alert';
import AppTextInput from '../../AppTextInput/AppTextInput';

interface Props {
  group: Group;
  housingCount: number;
  open?: boolean;
  onSubmit: (campaign: Pick<Campaign, 'title'>) => void;
  onClose: () => void;
}

function GroupCampaignCreationModal(props: Props) {
  const [title, setTitle] = useState('');
  const shape = {
    title: campaignTitleValidator,
  };
  type FormShape = typeof shape;
  const form = useForm(yup.object().shape(shape), {
    title,
  });

  async function submit(): Promise<void> {
    await form.validate(() =>
      props.onSubmit({
        title,
      })
    );
  }

  if (!props.open) {
    return <></>;
  }

  return (
    <ConfirmationModal
      title="Créer la campagne à partir d’un groupe"
      icon=""
      size="lg"
      alignFooter="right"
      onSubmit={submit}
      onClose={props.onClose}
    >
      <Container as="main" fluid>
        <Alert
          type="info"
          title="Une campagne va être créée sur la base de ce groupe."
          description="Une fois la campagne créée, les nouveaux logements ajoutés ultérieurement au groupe ne seront pas pris en compte dans la campagne."
          closable
          className="fr-mb-2w"
        />
        <Text>
          Vous êtes sur le point de créer une campagne comportant 
          {props.housingCount} logements.
        </Text>
        <AppTextInput<FormShape>
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setTitle(e.target.value)
          }
          label="Titre de la campagne"
          inputForm={form}
          inputKey="title"
          required
        />
        <Text>
          La liste a été établie à partir du groupe 
          <Text as="span" bold>
            {props.group.title}
          </Text>
          .
        </Text>
      </Container>
    </ConfirmationModal>
  );
}

export default GroupCampaignCreationModal;
