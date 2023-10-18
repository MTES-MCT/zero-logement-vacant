import React, { useState } from 'react';
import { Col, Container, Row, Text, Title } from '../_dsfr';
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
import AppHelp from '../_app/AppHelp/AppHelp';
import { dateShortFormat } from '../../utils/dateUtils';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { useAppDispatch } from '../../hooks/useStore';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const modal = createModal({
  id: 'campaign-bundle-title-modal',
  isOpenedByDefault: false,
});

interface Props {
  campaignBundle: CampaignBundle;
  as?: TitleAs;
  look?: TitleAs;
}

const CampaignBundleTitle = ({ campaignBundle, as, look }: Props) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { isCampaign } = useCampaignBundle(campaignBundle);

  const [campaignTitle, setCampaignTitle] = useState(
    campaignBundle.title ?? ''
  );
  const shape = {
    campaignTitle: campaignTitleValidator,
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    campaignTitle,
  });

  const submitTitle = async () => {
    await form.validate(() => {
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
        {campaignFullName(campaignBundle)}
        {isCampaign && (
          <Button
            iconId="fr-icon-edit-line"
            iconPosition="right"
            priority="tertiary no outline"
            onClick={modal.open}
          >
            Renommer
          </Button>
        )}
      </Title>
      {isCampaign && campaignBundle.createdAt && (
        <Text className="weight-500" spacing="mb-1w" size="sm">
          Campagne créé le {dateShortFormat(campaignBundle.createdAt)}
        </Text>
      )}
      {campaignBundle.campaignNumber === 0 && (
        <div className="fr-py-2w">
          <AppHelp>
            Les logements hors campagne sont les logements qui sont 
            <b>
              en cours de suivi mais qui ne sont pas compris dans une campagne.
            </b>
          </AppHelp>
        </div>
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

export default CampaignBundleTitle;
