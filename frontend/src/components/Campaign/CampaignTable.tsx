import { fr } from '@codegouvfr/react-dsfr';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PropsWithChildren, useMemo, useState } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { useSort } from '../../hooks/useSort';
import { useUser } from '../../hooks/useUser';
import { Campaign, CampaignSort } from '../../models/Campaign';
import { useFindCampaignsQuery } from '../../services/campaign.service';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { displayCount } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';

import AdvancedTable from '../AdvancedTable/AdvancedTable';
import CampaignStatusBadge from './CampaignStatusBadge';

interface CampaignTableProps {
  onArchive?(campaign: Campaign): void;
  onRemove?(campaign: Campaign): void;
}

const columnHelper = createColumnHelper<Campaign>();

function CampaignTable(props: CampaignTableProps) {
  const { onArchive, onRemove } = props;

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
              size="sm"
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
        header: () => (
          <Typography variant="body2" sx={{ textAlign: 'end' }}>
            Actions
          </Typography>
        ),
        cell: ({ row }) => {
          const campaign = row.original;
          const buttons: ButtonProps[] = [];

          if (!['draft', 'sending'].includes(campaign.status)) {
            buttons.push({
              children: 'Suivre',
              priority: 'secondary',
              size: 'small',
              linkProps: {
                to: `/parc-de-logements/campagnes/${campaign.id}`
              }
            });
          }
          if (!isVisitor) {
            if (['draft', 'sending'].includes(campaign.status)) {
              buttons.push({
                children: 'Accéder',
                priority: 'secondary',
                size: 'small',
                linkProps: {
                  to: `/campagnes/${campaign.id}`
                }
              });
            }
            if (campaign.status === 'in-progress') {
              buttons.push({
                title: 'Archiver la campagne',
                priority: 'tertiary',
                iconId: 'fr-icon-archive-line',
                size: 'small',
                onClick() {
                  onArchive?.(campaign);
                }
              });
            }
            if (campaign.status !== 'archived') {
              buttons.push({
                title: 'Supprimer la campagne',
                priority: 'tertiary',
                iconId: 'ri-delete-bin-line',
                size: 'small',
                onClick() {
                  onRemove?.(campaign);
                }
              });
            }
          }

          return (
            <Stack
              direction="row"
              sx={{ justifyContent: 'flex-end' }}
              spacing={1}
            >
              {buttons.map((buttonProps, i) => (
                <Button {...buttonProps} key={i} />
              ))}
            </Stack>
          );
        }
      })
    ],
    [getSortButton, isVisitor, onArchive, onRemove]
  );

  return (
    <>
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
        tableProps={{ noCaption: true, noScroll: true }}
        onPageChange={changePage}
        onPerPageChange={changePerPage}
      />
    </>
  );
}

function HeaderTitle(props: PropsWithChildren) {
  return (
    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
      {props.children}
    </Typography>
  );
}

export default CampaignTable;
