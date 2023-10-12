import React, { useEffect } from 'react';
import { Col, Container, Row, Text } from '../../components/_dsfr';
import { CampaignSteps } from '../../models/Campaign';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampaignInProgress';
import CampaignToValidate from './CampaignToValidate';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import {
  deleteCampaignBundle,
  getCampaignBundle,
} from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import CampaignBundleStats from '../../components/CampaignBundle/CampaignBundleStats';
import CampaignBundleInfos from '../../components/CampaignBundle/CampaignBundleInfos';
import CampaignBundleTitle from '../../components/CampaignBundle/CampaignBundleTitle';
import { hasFilters } from '../../models/HousingFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useStore';
import { numberOption } from '../../utils/numberUtils';
import MainContainer from '../../components/MainContainer/MainContainer';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

const CampaignView = () => {
  useDocumentTitle('Campagne');
  const dispatch = useAppDispatch();
  const campaignList = useCampaignList(true);
  const { campaignNumber, reminderNumber } = useParams<{
    campaignNumber: string;
    reminderNumber: string;
  }>();
  const { trackEvent } = useMatomo();

  const { bundle, step, isDeletable } = useCampaignBundle();

  useEffect(() => {
    dispatch(
      getCampaignBundle({
        campaignNumber: numberOption(campaignNumber),
        reminderNumber: numberOption(reminderNumber),
      })
    );
  }, [dispatch, campaignNumber, reminderNumber]);

  function removeCampaign(): void {
    if (bundle) {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.Delete,
      });
      dispatch(deleteCampaignBundle(bundle));
    }
  }

  return bundle &&
    bundle.campaignNumber === numberOption(campaignNumber) &&
    bundle.reminderNumber === numberOption(reminderNumber) ? (
    <MainContainer>
      <Row>
        <Col>
          <CampaignBundleTitle campaignBundle={bundle} look="h3" />
        </Col>
        {isDeletable && (
          <Col className="align-right">
            <ConfirmationModal
              modalId={`delete-${bundle.campaignNumber}-${bundle.reminderNumber}`}
              onSubmit={removeCampaign}
              openingButtonProps={{
                iconId: 'fr-icon-delete-bin-fill',
                priority: 'tertiary no outline',
                children: 'Supprimer la campagne',
                size: 'small',
              }}
            >
              <Text>
                Êtes-vous sûr de vouloir supprimer cette{' '}
                {bundle.reminderNumber ? 'relance' : 'campagne'} ?
              </Text>
              {!bundle.reminderNumber &&
                bundle.campaignNumber! < (campaignList ?? []).length && (
                  <Alert
                    description="Les campagnes suivantes seront renumérotées."
                    severity="info"
                    small
                  />
                )}
              <Alert
                description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                severity="info"
                small
              />
            </ConfirmationModal>
          </Col>
        )}
      </Row>
      <Row spacing="my-1w">
        <Col>
          <div>
            <CampaignBundleInfos campaignBundle={bundle} />
            {step && step >= CampaignSteps.InProgress && (
              <CampaignBundleStats campaignBundle={bundle} />
            )}
          </div>
        </Col>
      </Row>
      {bundle.filters && hasFilters(bundle.filters) && (
        <Row spacing="mb-5w">
          <Col>
            <Text size="sm" className="fr-mb-1w">
              Filtres utilisés pour la création de l'échantillon :
            </Text>
            <HousingFiltersBadges filters={bundle.filters} />
          </Col>
        </Row>
      )}
      {(bundle.campaignNumber ?? 0) > 0 &&
        step &&
        step >= CampaignSteps.InProgress && (
          <Alert
            title="Bienvenue dans l’espace suivi de votre campagne."
            description="Vous retrouverez ici tous les logements ciblés par cette campagne. Mettez-les à jour logement par logement ou par groupe de logements."
            className="fr-my-3w"
            closable
            severity="info"
          />
        )}
      {step !== null && (
        <Container spacing="pb-4w px-0" as="article">
          {(bundle.campaignNumber ?? 0) > 0 &&
          step < CampaignSteps.InProgress ? (
            <CampaignToValidate campaignStep={step} />
          ) : (
            <CampaignInProgress />
          )}
        </Container>
      )}
    </MainContainer>
  ) : (
    <></>
  );
};

export default CampaignView;
