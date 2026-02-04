import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type InferType, object } from 'yup';

import ConfirmationModal from '~/components/modals/ConfirmationModal/ConfirmationModal';
import {
  campaignDescriptionValidator,
  campaignTitleValidator
} from '~/hooks/useForm';
import { type Campaign } from '~/models/Campaign';
import { type Group } from '~/models/Group';
import { displayCount } from '~/utils/stringUtils';
import AppTextInputNext from '../../_app/AppTextInput/AppTextInputNext';
import { Container, Text } from '../../_dsfr';

interface Props {
  group: Group;
  housingCount: number;
  openingButtonProps?: {
    className?: string;
  };
  onSubmit: (campaign: Pick<Campaign, 'title' | 'description'>) => void;
}

const schema = object({
  title: campaignTitleValidator,
  description: campaignDescriptionValidator.required()
});

type FormSchema = InferType<typeof schema>;

function GroupCampaignCreationModal(props: Props) {
  const form = useForm<FormSchema>({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: ''
    },
    mode: 'onBlur'
  });

  const onSubmit: SubmitHandler<FormSchema> = (data) => {
    props.onSubmit({
      title: data.title,
      description: data.description
    });
  };

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
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Container as="main" fluid>
        <Text>
          <span data-testid="housing-infos">
            Vous êtes sur le point de créer une campagne sur la base de ce
            groupe comportant{' '}
            <b>{displayCount(props.housingCount, 'logement')}.</b> Une fois la
            campagne créée, les nouveaux logements ajoutés ultérieurement au
            groupe ne seront pas pris en compte dans la campagne.
          </span>
        </Text>
        <AppTextInputNext<FormSchema>
          name="title"
          label="Titre de la campagne (obligatoire)"
          control={form.control}
          data-testid="campaign-title-input"
        />
        <AppTextInputNext<FormSchema>
          name="description"
          label="Description de la campagne"
          control={form.control}
          textArea
        />
        <Text>
          La liste a été établie à partir du groupe &nbsp;
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
