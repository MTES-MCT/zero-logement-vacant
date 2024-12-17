import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PropsWithChildren, useMemo, useState } from 'react';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import {
  Campaign,
  CampaignSort,
  isCampaignDeletable
} from '../../models/Campaign';
import AppLink from '../../components/_app/AppLink/AppLink';
import CampaignStatusBadge from '../../components/Campaign/CampaignStatusBadge';
import { displayCount } from '../../utils/stringUtils';
import { Text } from '../../components/_dsfr';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import {
  useFindCampaignsQuery,
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '../../services/campaign.service';
import { useSort } from '../../hooks/useSort';
import { useUser } from '../../hooks/useUser';
import AdvancedTable from '../../components/AdvancedTable/AdvancedTable';
import { useNotification } from '../../hooks/useNotification';
import { usePagination } from '../../hooks/usePagination';
import { DefaultPagination } from '../../store/reducers/housingReducer';

const columnHelper = createColumnHelper<Campaign>();

function CampaignListView() {
  useDocumentTitle('Campagnes');
  const { isVisitor } = useUser();

  const [pagination, setPagination] = useState(DefaultPagination);
  const { page, pageCount, perPage, changePage, changePerPage } = usePagination(
    {
      pagination,
      setPagination
    }
  );
  const { sort, getSortButton } = useSort<CampaignSort>({
    default: {
      createdAt: 'desc'
    }
  });
  const { data: campaigns, isLoading } = useFindCampaignsQuery({ sort });

  const [removeCampaign, campaignRemovalMutation] = useRemoveCampaignMutation();
  const [updateCampaign, campaignUpdateMutation] = useUpdateCampaignMutation();
  useNotification({
    toastId: 'remove-campaign',
    isLoading: campaignRemovalMutation.isLoading,
    isError: campaignRemovalMutation.isError,
    isSuccess: campaignRemovalMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression de la campagne',
      loading: 'Suppression de la campagne...',
      success: 'Campagne supprimée !'
    }
  });
  useNotification({
    toastId: 'archive-campaign',
    isLoading: campaignUpdateMutation.isLoading,
    isError: campaignUpdateMutation.isError,
    isSuccess: campaignUpdateMutation.isSuccess,
    message: {
      error: 'Erreur lors de l’archivage de la campagne',
      loading: 'Archivage de la campagne...',
      success: 'Campagne archivée !'
    }
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: () => (
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            spacing={1}
          >
            <HeaderTitle>Titre</HeaderTitle>
            {getSortButton('title', 'Trier par titre')}
          </Stack>
        ),
        cell: ({ row }) => {
          const campaign = row.original;
          return (
            <AppLink
              isSimple
              to={`${
                campaign.status === 'draft' || campaign.status === 'sending'
                  ? ''
                  : '/parc-de-logements'
              }/campagnes/${campaign.id}`}
            >
              {campaign.title}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('status', {
        header: () => (
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            spacing={1}
          >
            <HeaderTitle>Statut</HeaderTitle>
            {getSortButton('status', 'Trier par statut')}
          </Stack>
        ),
        cell: ({ cell }) => (
          <CampaignStatusBadge
            badgeProps={{ small: true }}
            status={cell.getValue()}
          />
        )
      }),
      columnHelper.accessor('createdAt', {
        header: () => (
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            spacing={1}
          >
            <HeaderTitle>Date de création</HeaderTitle>
            {getSortButton('createdAt', 'Trier par date de création')}
          </Stack>
        ),
        cell: ({ cell }) => format(new Date(cell.getValue()), 'dd/MM/yyyy')
      }),
      columnHelper.accessor('sentAt', {
        header: () => (
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            spacing={1}
          >
            <HeaderTitle>Date d’envoi</HeaderTitle>
            {getSortButton('sentAt', 'Trier par date d’envoi')}
          </Stack>
        ),
        cell: ({ cell }) => {
          const value = cell.getValue();
          return value ? format(new Date(value), 'dd/MM/yyyy') : null;
        }
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const campaign = row.original;
          return (
            <Stack
              direction="row"
              sx={{ justifyContent: 'flex-end' }}
              spacing={1}
            >
              {!['draft', 'sending'].includes(campaign.status) && (
                <Button
                  priority="secondary"
                  size="small"
                  linkProps={{
                    to: `/parc-de-logements/campagnes/${campaign.id}`
                  }}
                >
                  Suivre
                </Button>
              )}
              {!isVisitor && ['draft', 'sending'].includes(campaign.status) && (
                <Button
                  role="link"
                  priority="secondary"
                  size="small"
                  linkProps={{
                    to: `/campagnes/${campaign.id}`
                  }}
                >
                  Accéder
                </Button>
              )}
              {!isVisitor && campaign.status === 'in-progress' && (
                <ConfirmationModal
                  onSubmit={() => {
                    updateCampaign({ ...campaign, status: 'archived' });
                  }}
                  modalId={`archive-${campaign.id}`}
                  openingButtonProps={{
                    title: 'Archiver la campagne',
                    priority: 'tertiary',
                    iconId: 'fr-icon-archive-line',
                    size: 'small',
                    type: 'button'
                  }}
                >
                  <Typography>
                    Êtes-vous sûr de vouloir archiver cette campagne ?
                  </Typography>
                </ConfirmationModal>
              )}
              {!isVisitor && isCampaignDeletable(campaign) && (
                <ConfirmationModal
                  onSubmit={() => {
                    removeCampaign(campaign.id);
                  }}
                  modalId={`delete-${campaign.id}`}
                  openingButtonProps={{
                    title: 'Supprimer la campagne',
                    priority: 'tertiary',
                    iconId: 'fr-icon-delete-bin-line',
                    size: 'small',
                    type: 'button'
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
            </Stack>
          );
        }
      })
    ],
    [getSortButton, isVisitor, removeCampaign, updateCampaign]
  );

  return (
    <MainContainer
      title={
        <>
          Vos campagnes
          <Button
            priority="secondary"
            linkProps={{
              to: 'https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5',
              target: '_blank'
            }}
            className="float-right"
          >
            Voir la bibliothèque des courriers
          </Button>
        </>
      }
    >
      {campaigns && (
        <Typography
          variant="body2"
          sx={{ color: fr.colors.decisions.text.mention.grey.default }}
        >
          {displayCount(campaigns.length, 'campagne', {
            capitalize: true,
            feminine: true
          })}
        </Typography>
      )}
      <AdvancedTable
        columns={columns}
        data={campaigns}
        isLoading={isLoading}
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        tableProps={{ bordered: true, fixed: true, noCaption: true }}
        onPageChange={changePage}
        onPerPageChange={changePerPage}
      />
    </MainContainer>
  );
}

function HeaderTitle(props: PropsWithChildren) {
  return (
    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
      {props.children}
    </Typography>
  );
}

export default CampaignListView;
