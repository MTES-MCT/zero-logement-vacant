import React from 'react';
import { Container, Text } from '../../_dsfr/index';
import { displayCount } from '../../../utils/stringUtils';
import { CampaignBundle, CampaignSteps } from '../../../models/Campaign';
import { TrackEventActions, TrackEventCategories } from '../../../models/TrackEvent';
import { validCampaignStep } from '../../../store/actions/campaignAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useAppDispatch } from '../../../hooks/useStore';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Radio, RadioGroup } from '../../_dsfr';

const modal = createModal({
  id: 'campaign-export-modal',
  isOpenedByDefault: true,
});

interface Props {
  campaignBundle: CampaignBundle;
}

const CampaignExportModal = ({ campaignBundle }: Props) => {
  const dispatch = useAppDispatch();
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
    <modal.Component
      title={
        <>
          <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
          Exporter
        </>
      }
      buttons={[
        {
          children: 'Annuler',
          priority: 'secondary',
        },
        {
          children: 'download',
          linkProps: {
            to: campaignBundle.exportURL,
            onClick: onSubmit,
          },
          doClosesModal: false,
        },
      ]}
    >
      <Container as="section" fluid>
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
    </modal.Component>
  );
};

export default CampaignExportModal;
