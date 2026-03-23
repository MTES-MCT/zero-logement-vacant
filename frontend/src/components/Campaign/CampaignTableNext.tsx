import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Number, pipe, Record } from 'effect';
import { useMemo, useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import CampaignSentAtButton from '~/components/Campaign/CampaignSentAtButton';
import { useUser } from '~/hooks/useUser';
import { type Campaign } from '~/models/Campaign';
import { useFindCampaignsQuery } from '~/services/campaign.service';
import { displayCount } from '~/utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import WaitingBadge from './WaitingBadge';

export interface CampaignTableProps {
  onSentAt(campaign: Campaign): void;
  onRemove(campaign: Campaign): void;
}

const columnHelper = createColumnHelper<Campaign>();

function CampaignTableNext(props: CampaignTableProps) {
  const { onSentAt, onRemove } = props;

  const { isVisitor } = useUser();

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
        header: 'Nom',
        meta: {
          sort: {
            title: 'Trier par nom'
          },
          styles: {
            multiline: true
          }
        },
        cell: ({ cell, row }) => {
          const campaign = row.original;
          return (
            <AppLink isSimple size="sm" to={`/campagnes/${campaign.id}`}>
              {cell.getValue()}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('createdAt', {
        header: 'Création',
        meta: {
          sort: {
            title: 'Trier par date de création'
          }
        },
        cell: ({ cell }) => format(new Date(cell.getValue()), 'dd/MM/yyyy')
      }),
      columnHelper.accessor('housingCount', {
        header: 'Logements',
        meta: {
          sort: {
            title: 'Trier par nombre de logements'
          }
        },
        cell: ({ cell }) =>
          `${cell.getValue()} logement${cell.getValue() > 1 ? 's' : ''}`
      }),
      columnHelper.accessor('ownerCount', {
        header: 'Propriétaires',
        meta: {
          sort: {
            title: 'Trier par nombre de propriétaires'
          }
        },
        cell: ({ cell }) =>
          `${cell.getValue()} propriétaire${cell.getValue() > 1 ? 's' : ''}`
      }),
      columnHelper.accessor('sentAt', {
        header: 'Date d’envoi',
        meta: {
          sort: {
            title: 'Trier par date d’envoi'
          }
        },
        cell: ({ cell, row }) => {
          const value = cell.getValue();
          return value ? (
            format(new Date(value), 'dd/MM/yyyy')
          ) : (
            <CampaignSentAtButton onClick={() => onSentAt(row.original)} />
          );
        }
      }),
      columnHelper.accessor('returnCount', {
        header: 'Retours',
        meta: {
          sort: {
            title: 'Trier par nombre de retours'
          }
        },
        cell: ({ cell, row }) => {
          const value = `${cell.getValue()} retours`;
          return row.original.sentAt ? value : <WaitingBadge />;
        }
      }),
      columnHelper.accessor('returnRate', {
        header: 'Taux de retour',
        meta: {
          sort: {
            title: 'Trier par taux de retour'
          }
        },
        cell: ({ cell, row }) => {
          if (!row.original.sentAt) {
            return <WaitingBadge />;
          }

          const value = cell.getValue();
          if (!value) {
            return null;
          }

          const formatted = pipe(
            value,
            Number.round(2),
            Number.multiply(100),
            (n) => `${n} %`
          );
          return formatted;
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
          return (
            <Stack
              direction="row"
              sx={{ justifyContent: 'flex-end' }}
              spacing="1rem"
              useFlexGap
            >
              <Button
                priority="secondary"
                size="small"
                linkProps={{ to: `/campagnes/${row.original.id}` }}
              >
                Accéder
              </Button>

              {isVisitor ? null : (
                <Button
                  priority="tertiary"
                  size="small"
                  iconId="ri-delete-bin-line"
                  title={`Supprimer la campagne ${row.original.title}`}
                  nativeButtonProps={{
                    'aria-label': `Supprimer la campagne ${row.original.title}`
                  }}
                  onClick={() => onRemove?.(row.original)}
                />
              )}
            </Stack>
          );
        }
      })
    ],
    [isVisitor, onSentAt, onRemove]
  );

  return (
    <>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          mb: '-1rem'
        }}
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
      </Stack>

      <AdvancedTable
        caption="Vos campagnes"
        columns={columns}
        data={campaigns}
        isLoading={isLoading}
        enableSorting
        enableSortingRemoval
        manualSorting
        state={{ sorting }}
        tableProps={{ noCaption: true }}
        onSortingChange={setSorting}
      />
    </>
  );
}

export default CampaignTableNext;
