import React, { useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import { useCampaignList } from '../../hooks/useCampaignList';
import Table from '@codegouvfr/react-dsfr/Table';
import { format } from 'date-fns';
import {
  CampaignSort,
  CampaignSortable,
  campaignStep,
  CampaignSteps,
  isCampaignDeletable,
} from '../../models/Campaign';
import AppLink from '../../components/_app/AppLink/AppLink';
import CampaignStatusBadge from '../../components/Campaign/CampaignStatusBadge';
import { displayCount } from '../../utils/stringUtils';
import { Text } from '../../components/_dsfr';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import styles from './campaign.module.scss';
import { useRemoveCampaignMutation, useUpdateCampaignMutation } from '../../services/campaign.service';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import { useSort } from '../../hooks/useSort';

const CampaignsListView = () => {
  useDocumentTitle('Campagnes');
  const { trackEvent } = useMatomo();

  const [sort, setSort] = useState<CampaignSort>({ createdAt: 'desc' });
  const campaigns = useCampaignList({ sort });

  const [removeCampaign] = useRemoveCampaignMutation();
  const onDeleteCampaign = async (campaignId: string) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.Delete,
    });
    await removeCampaign(campaignId);
  };

  const [updateCampaignStep] = useUpdateCampaignMutation();
  const onArchiveCampaign = async (campaignId: string) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.Archive,
    });

    await updateCampaignStep({
      id: campaignId,
      campaignUpdate: {
        stepUpdate: {
          step: CampaignSteps.Archived,
        },
      },
    });
  };

  const { getSortButton } = useSort<CampaignSortable>({
    onSort: setSort,
    default: sort,
  });

  return (
    <MainContainer
      title={
        <>
          Vos campagnes
          <Button
            priority="secondary"
            linkProps={{
              to: 'https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R',
              target: '_blank',
            }}
            className="float-right"
          >
            Voir la bibliothèque des courriers
          </Button>
        </>
      }
    >
      {campaigns && (
        <>
          <div className="fr-mb-2w">
            {displayCount(campaigns.length, 'campagne', {
              capitalize: true,
              feminine: true,
            })}
          </div>
          <Table
            caption="Liste des campagnes"
            noCaption
            className="zlv-table with-row-number campaign-list"
            fixed
            headers={[
              '',
              'Titre',
              getSortButton('status', 'Statut'),
              getSortButton('createdAt', 'Date de création'),
              getSortButton('sendingDate', "Date d'envoi"),
              'Effectifs',
              '',
            ]}
            data={campaigns.map((campaign, index) => [
              `#${index + 1}`,
              <AppLink
                isSimple
                to={`${
                  campaignStep(campaign) < CampaignSteps.InProgress
                    ? ''
                    : '/parc-de-logements'
                }/campagnes/${campaign.id}`}
              >
                {campaign.title}
              </AppLink>,
              <CampaignStatusBadge step={campaignStep(campaign)} />,
              format(campaign.createdAt, 'dd/MM/yyyy'),
              campaign.sendingDate
                ? format(campaign.sendingDate, 'dd/MM/yyyy')
                : '',
              <CampaignCounts campaignId={campaign.id} />,
              <div className="fr-btns-group fr-btns-group--sm fr-btns-group--right fr-btns-group--inline fr-pr-2w">
                <Button
                  priority="tertiary"
                  linkProps={{
                    to: `${
                      campaignStep(campaign) < CampaignSteps.InProgress
                        ? ''
                        : '/parc-de-logements'
                    }/campagnes/${campaign.id}`,
                  }}
                  className={styles.buttonInGroup}
                >
                  {campaignStep(campaign) < CampaignSteps.InProgress
                    ? 'Accéder'
                    : 'Suivre'}
                </Button>
                {campaignStep(campaign) === CampaignSteps.InProgress && (
                  <ConfirmationModal
                    onSubmit={() => onArchiveCampaign(campaign.id)}
                    modalId={`archive-${campaign.id}`}
                    openingButtonProps={{
                      priority: 'tertiary',
                      iconId: 'fr-icon-archive-fill',
                      className: styles.buttonInGroup,
                    }}
                  >
                    <Text size="md">
                      Êtes-vous sûr de vouloir archiver cette campagne ?
                    </Text>
                  </ConfirmationModal>
                )}
                {isCampaignDeletable(campaign) && (
                  <ConfirmationModal
                    onSubmit={() => onDeleteCampaign(campaign.id)}
                    modalId={`delete-${campaign.id}`}
                    openingButtonProps={{
                      priority: 'tertiary',
                      iconId: 'fr-icon-delete-bin-fill',
                      className: styles.buttonInGroup,
                    }}
                  >
                    <Text size="md">
                      Êtes-vous sûr de vouloir supprimer cette campagne ?
                    </Text>
                    <Alert
                      description='Les statuts des logements "En attente de retour" repasseront en "Non suivi". Les autres statuts mis à jour ne seront pas modifiés.'
                      severity="info"
                      small
                    />
                  </ConfirmationModal>
                )}
              </div>,
            ])}
          />
        </>
      )}
    </MainContainer>
  );
};

export default CampaignsListView;
