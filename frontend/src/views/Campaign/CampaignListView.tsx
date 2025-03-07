import { useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import { useCampaignList } from '../../hooks/useCampaignList';
import Table from '@codegouvfr/react-dsfr/Table';
import { format } from 'date-fns';
import {
  Campaign,
  CampaignSort,
  CampaignSortable,
  isCampaignDeletable,
} from '../../models/Campaign';
import AppLink from '../../components/_app/AppLink/AppLink';
import CampaignStatusBadge from '../../components/Campaign/CampaignStatusBadge';
import { displayCount } from '../../utils/stringUtils';
import { Text } from '../../components/_dsfr';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import styles from './campaign.module.scss';
import {
  useRemoveCampaignMutation,
  useUpdateCampaignMutation,
} from '../../services/campaign.service';
import { useSort } from '../../hooks/useSort';
import { useUser } from '../../hooks/useUser';

const CampaignsListView = () => {
  useDocumentTitle('Campagnes');
  const { isVisitor } = useUser();

  const [sort, setSort] = useState<CampaignSort>({ createdAt: 'desc' });
  const campaigns = useCampaignList({ sort });

  const [removeCampaign] = useRemoveCampaignMutation();
  const onDeleteCampaign = async (campaignId: string): Promise<void> => {
    await removeCampaign(campaignId).unwrap();
  };

  const [updateCampaign] = useUpdateCampaignMutation();
  const onArchiveCampaign = async (campaign: Campaign): Promise<void> => {
    await updateCampaign({ ...campaign, status: 'archived' }).unwrap();
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
              to: 'https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5',
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
              getSortButton('sentAt', "Date d’envoi"),
              '',
            ]}
            data={campaigns.map((campaign, index) => [
              `#${index + 1}`,
              <AppLink
                isSimple
                key={`${campaign.id}-link`}
                to={`${
                  campaign.status === 'draft' || campaign.status === 'sending'
                    ? ''
                    : '/parc-de-logements'
                }/campagnes/${campaign.id}`}
              >
                {campaign.title}
              </AppLink>,
              <CampaignStatusBadge
                key={`${campaign.id}-status`}
                status={campaign.status}
              />,
              format(new Date(campaign.createdAt), 'dd/MM/yyyy'),
              campaign.sentAt
                ? format(new Date(campaign.sentAt), 'dd/MM/yyyy')
                : '',
              <div
                className="fr-btns-group fr-btns-group--sm fr-btns-group--right fr-btns-group--inline fr-pr-2w"
                key={`${campaign.id}-actions`}
              >
                { !(campaign.status === 'draft' || campaign.status === 'sending') && (
                  <Button
                    priority="tertiary"
                    linkProps={{
                      to: `/parc-de-logements/campagnes/${campaign.id}`,
                    }}
                    className={styles.buttonInGroup}
                  >
                    Suivre
                  </Button>
                )}
                { (!isVisitor && (campaign.status === 'draft' || campaign.status === 'sending')) && (
                  <Button
                    priority="tertiary"
                    linkProps={{
                      to: `/campagnes/${campaign.id}`,
                    }}
                    className={styles.buttonInGroup}
                  >
                    Accéder
                  </Button>
                )}
                { !isVisitor && campaign.status === 'in-progress' && (
                  <ConfirmationModal
                    onSubmit={() => onArchiveCampaign(campaign)}
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
                { !isVisitor && isCampaignDeletable(campaign) && (
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
