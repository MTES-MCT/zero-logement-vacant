import { fr } from '@codegouvfr/react-dsfr';
import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Record } from 'effect';
import { useMemo, useState } from 'react';

import { usePagination } from '../../hooks/usePagination';
import { useUser } from '../../hooks/useUser';
import { type Campaign } from '../../models/Campaign';
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

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }
  ]);
  const { data: campaigns, isLoading } = useFindCampaignsQuery({
    sort: Record.fromEntries(
      sorting.map((s) => [s.id, s.desc ? 'desc' : 'asc'])
    )
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Titre',
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
        header: 'Statut',
        cell: ({ cell }) => (
          <CampaignStatusBadge
            badgeProps={{ small: true }}
            status={cell.getValue()}
          />
        )
      }),
      columnHelper.accessor('createdAt', {
        header: 'Date de création',
        cell: ({ cell }) => format(new Date(cell.getValue()), 'dd/MM/yyyy')
      }),
      columnHelper.accessor('sentAt', {
        header: 'Date d’envoi',
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
    [isVisitor, onArchive, onRemove]
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
        enableSorting
        enableSortingRemoval
        manualSorting
        state={{ sorting }}
        tableProps={{ noCaption: true, fixed: true }}
        onSortingChange={setSorting}
        onPageChange={changePage}
        onPerPageChange={changePerPage}
      />
    </>
  );
}

export default CampaignTable;
