import React from 'react';
import {
  Button,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Radio,
  RadioGroup,
  Text,
} from '@dataesr/react-dsfr';
import { displayCount } from '../../../utils/stringUtils';
import { CampaignBundle, CampaignSteps } from '../../../models/Campaign';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../../models/TrackEvent';
import { validCampaignStep } from '../../../store/actions/campaignAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useDispatch } from 'react-redux';

interface Props {
  campaignBundle: CampaignBundle;
  onClose: () => void;
}

const CampaignExportModal = ({ campaignBundle, onClose }: Props) => {
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();

  const onSubmit = () => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.ValidStep(CampaignSteps.Export),
    });
    dispatch(
      validCampaignStep(campaignBundle.campaignIds[0], CampaignSteps.Export)
    );
  };

  return (
    <Modal
      isOpen={true}
      hide={() => onClose()}
      data-testid="campaign-export-modal"
    >
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Exporter
      </ModalTitle>
      <ModalContent>
        <Container fluid>
          <Text size="md" className="fr-mb-0">
            <b>{displayCount(campaignBundle.housingCount, 'logement')}</b>
          </Text>
          <Text size="md">
            <b>{displayCount(campaignBundle.ownerCount, 'propriétaire')}</b>
          </Text>
          <RadioGroup legend="">
            <Radio
              label="Pour publipostage (.csv avec coordonnées postales)"
              value="0"
              defaultChecked
            />
            <Radio
              label="Pour analyse (.csv avec toutes les données)"
              value="1"
              disabled
            />
          </RadioGroup>
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <a
          href={campaignBundle.exportURL}
          onClick={() => onSubmit()}
          className="fr-btn--md fr-btn"
          download
        >
          Exporter
        </a>
      </ModalFooter>
    </Modal>
  );
};

export default CampaignExportModal;
