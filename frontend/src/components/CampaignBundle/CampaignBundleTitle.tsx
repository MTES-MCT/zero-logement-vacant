import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  Col,
  Container,
  Modal,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import {
  CampaignBundle,
  CampaignBundleId,
  campaignFullName,
} from '../../models/Campaign';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { updateCampaignBundleTitle } from '../../store/actions/campaignAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import * as yup from 'yup';
import { campaignTitleValidator, useForm } from '../../hooks/useForm';
import ButtonLink from '../ButtonLink/ButtonLink';
import Help from '../Help/Help';
import { dateShortFormat } from '../../utils/dateUtils';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { useAppDispatch } from '../../hooks/useStore';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface Props {
  campaignBundle: CampaignBundle;
  as?: TitleAs;
}

const CampaignBundleTitle = ({ campaignBundle, as }: Props) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { isCampaign } = useCampaignBundle(campaignBundle);

  const [campaignTitle, setCampaignTitle] = useState(
    campaignBundle.title ?? ''
  );
  const schema = yup.object().shape({
    campaignTitle: campaignTitleValidator,
  });
  const { isValid, message, messageType, validate } = useForm(schema, {
    campaignTitle,
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const submitTitle = () => {
    validate().then(() => {
      if (isValid()) {
        trackEvent({
          category: TrackEventCategories.Campaigns,
          action: TrackEventActions.Campaigns.Rename,
        });
        dispatch(
          updateCampaignBundleTitle(
            campaignBundle as CampaignBundleId,
            campaignTitle
          )
        );
        setIsModalOpen(false);
      }
    });
  };

  return (
    <>
      <Title as={as ?? 'h1'} className="fr-mb-1w ds-fr--inline-block fr-mr-2w">
        {campaignFullName(campaignBundle)}
      </Title>
      {isCampaign && (
        <ButtonLink
          display="flex"
          icon="ri-edit-2-fill"
          iconPosition="left"
          iconSize="1x"
          isSimple
          onClick={() => setIsModalOpen(true)}
        >
          Renommer
        </ButtonLink>
      )}
      {isCampaign && campaignBundle.createdAt && (
        <Text className="subtitle" spacing="mb-2w">
          échantillon créé le <b>{dateShortFormat(campaignBundle.createdAt)}</b>
        </Text>
      )}
      {campaignBundle.campaignNumber === 0 && (
        <div className="fr-py-2w">
          <Help>
            Les logements hors campagne sont les logements qui sont{' '}
            <b>
              en cours de suivi mais qui ne sont pas compris dans une campagne.
            </b>
          </Help>
        </div>
      )}
      <Modal isOpen={isModalOpen} hide={() => setIsModalOpen(false)}>
        <ModalTitle>
          <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
          Titre de la campagne
        </ModalTitle>
        <ModalContent>
          <Container as="section" fluid>
            <Row gutters>
              <Col n="10">
                <TextInput
                  value={campaignTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCampaignTitle(e.target.value)
                  }
                  label="Titre de la campagne"
                  placeholder="Titre de la campagne"
                  message={message('campaignTitle')}
                  messageType={messageType('campaignTitle')}
                  required
                />
              </Col>
            </Row>
          </Container>
        </ModalContent>
        <ModalFooter>
          <Button
            title="Annuler"
            secondary
            className="fr-mr-2w"
            onClick={() => setIsModalOpen(false)}
          >
            Annuler
          </Button>
          <Button title="Enregistrer" onClick={() => submitTitle()}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default CampaignBundleTitle;
