import { Alert } from '@codegouvfr/react-dsfr/Alert';

import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import * as yup from 'yup';
import { useState } from 'react';
import { campaignTitleValidator, useForm } from '../../../hooks/useForm';
import { Campaign } from '../../../models/Campaign';
import { Group } from '../../../models/Group';
import { Container, Text } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { ButtonProps } from '@codegouvfr/react-dsfr/Button';

interface Props {
  group: Group;
  housingCount: number;
  openingButtonProps?: Omit<ButtonProps, 'onClick'>;
  onSubmit: (campaign: Pick<Campaign, 'title'>) => void;
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

  return (
    <ConfirmationModal
      title="Créer la campagne à partir d’un groupe"
      modalId="group-campaign-creation-modal"
      data-testid="group-campaign-creation-modal"
      size="large"
      openingButtonProps={{
        children: 'Créer une campagne',
        disabled: props.housingCount === 0,
        ...props.openingButtonProps,
      }}
      onSubmit={submit}
    >
      <Container as="main" fluid>
        <Alert
          severity="info"
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
          onChange={(e) => setTitle(e.target.value)}
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
