import React, { useState } from 'react';
import { Col, Container, Row, Text, Title } from '../_dsfr';
import { Campaign } from '../../models/Campaign';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import * as yup from 'yup';
import { campaignTitleValidator, useForm } from '../../hooks/useForm';
import { dateShortFormat } from '../../utils/dateUtils';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';
import { useUpdateCampaignMutation } from '../../services/campaign.service';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const modal = createModal({
  id: 'campaign-title-modal',
  isOpenedByDefault: false,
});

interface Props {
  campaign: Campaign;
  as?: TitleAs;
  look?: TitleAs;
}

const CampaignTitle = ({ campaign, as, look }: Props) => {
  const { trackEvent } = useMatomo();

  const [updateCampaignTitle] = useUpdateCampaignMutation();

  const [campaignTitle, setCampaignTitle] = useState(campaign.title ?? '');
  const shape = {
    campaignTitle: campaignTitleValidator,
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    campaignTitle,
  });

  const submitTitle = async () => {
    await form.validate(async () => {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.Rename,
      });
      await updateCampaignTitle({
        id: campaign.id,
        campaignUpdate: {
          titleUpdate: {
            title: campaignTitle,
          },
        },
      });
      modal.close();
    });
  };

  return (
    <>
      <Title
        as={as ?? 'h1'}
        look={look ?? as ?? 'h1'}
        className="fr-mb-2w ds-fr--inline-block fr-mr-2w"
      >
        {campaign.title}
        <Button
          iconId="fr-icon-edit-line"
          iconPosition="right"
          priority="tertiary no outline"
          onClick={modal.open}
        >
          Renommer
        </Button>
      </Title>
      {campaign.createdAt && (
        <Text className="weight-500" spacing="mb-1w" size="sm">
          Campagne créé le {dateShortFormat(campaign.createdAt)}
        </Text>
      )}
      <modal.Component
        title={
          <>
            <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
            Titre de la campagne
          </>
        }
        buttons={[
          {
            children: 'Annuler',
            className: 'fr-mr-2w',
            priority: 'secondary',
          },
          {
            onClick: () => submitTitle(),
            children: 'Enregistrer',
          },
        ]}
      >
        <Container as="section" fluid>
          <Row gutters>
            <Col n="10">
              <AppTextInput<FormShape>
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                label="Titre de la campagne (obligatoire)"
                placeholder="Titre de la campagne"
                inputForm={form}
                inputKey="campaignTitle"
                required
              />
            </Col>
          </Row>
        </Container>
      </modal.Component>
    </>
  );
};

export default CampaignTitle;
