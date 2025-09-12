import { Alert } from '@codegouvfr/react-dsfr/Alert';

import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import * as yup from 'yup';
import { useState } from 'react';
import {
  campaignDescriptionValidator,
  campaignTitleValidator,
  useForm
} from '../../../hooks/useForm';
import { Campaign } from '../../../models/Campaign';
import { Group } from '../../../models/Group';
import { Container, Text } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { displayCount } from '../../../utils/stringUtils';

interface Props {
  group: Group;
  housingCount: number;
  openingButtonProps?: {
    className?: string;
  };
  onSubmit: (campaign: Pick<Campaign, 'title' | 'description'>) => void;
}

function GroupCampaignCreationModal(props: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const shape = {
    title: campaignTitleValidator,
    description: campaignDescriptionValidator
  };
  type FormShape = typeof shape;
  const form = useForm(yup.object().shape(shape), {
    title,
    description
  });

  async function submit(): Promise<void> {
    await form.validate(() =>
      props.onSubmit({
        title,
        description
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
        ...props.openingButtonProps,
        children: 'Créer une campagne',
        disabled: props.housingCount === 0
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
          <span data-testid="housing-infos">
            Vous êtes sur le point de créer une campagne comportant{' '}
            <b>{displayCount(props.housingCount, 'logement')}.</b>
          </span>
        </Text>
        <AppTextInput<FormShape>
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          label="Titre de la campagne"
          placeholder="Titre de la campagne (obligatoire)"
          inputForm={form}
          inputKey="title"
          required
          data-testid="campaign-title-input"
        />
        <AppTextInput<FormShape>
          textArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          label="Description de la campagne"
          placeholder="Description de la campagne"
          inputForm={form}
          inputKey="description"
        />
        <Text>
          La liste a été établie à partir du groupe &nbsp;<Text as="span" bold>{props.group.title}</Text>
          .
        </Text>
      </Container>
    </ConfirmationModal>
  );
}

export default GroupCampaignCreationModal;
