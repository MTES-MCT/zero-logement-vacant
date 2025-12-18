import Alert from '@codegouvfr/react-dsfr/Alert';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';

import {
  formatAddress as formatAddressDTO,
  type Pagination
} from '@zerologementvacant/models';
import { Fragment, type ReactNode, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useNotification } from '../../hooks/useNotification';
import { type Address, isBanEligible } from '../../models/Address';
import type { Campaign } from '../../models/Campaign';
import type { Housing } from '../../models/Housing';
import { useRemoveCampaignHousingMutation } from '../../services/campaign.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../../services/housing.service';
import AppLink from '../_app/AppLink/AppLink';
import AdvancedTable from '../AdvancedTable/AdvancedTable';
import AdvancedTableHeader from '../AdvancedTable/AdvancedTableHeader';
import OwnerEditionSideMenu from '../OwnerEditionSideMenu/OwnerEditionSideMenu';

interface Props {
  campaign: Campaign;
}

const removeCampaignHousingModal = createModal({
  id: 'remove-campaign-housing-modal',
  isOpenedByDefault: false
});
const columnHelper = createColumnHelper<Housing>();

function CampaignRecipients(props: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50
  });
  const filters = {
    campaignIds: [props.campaign.id]
  };
  const apiPagination: Pagination = {
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize
  };
  const { data: housings, isLoading } = useFindHousingQuery({
    filters,
    pagination: apiPagination
  });
  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  function formatAddress(address: Address): ReactNode[] {
    return formatAddressDTO(address).map((line) => (
      <Typography key={line} variant="body2">
        {line}
      </Typography>
    ));
  }

  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Housing | null>(null);
  function onRemove(housing: Housing): void {
    setSelected(housing);
    removeCampaignHousingModal.open();
  }

  const [removeCampaignHousing, removal] = useRemoveCampaignHousingMutation();
  useNotification({
    toastId: 'remove-campaign-housing-toast',
    isError: removal.isError,
    isLoading: removal.isLoading,
    isSuccess: removal.isSuccess,
    message: {
      error: 'Erreur lors de la suppression du destinataire',
      loading: 'Suppression du destinataire...',
      success: 'Destinataire supprimé !'
    }
  });

  async function confirmRemoval() {
    if (selected) {
      removeCampaignHousing({
        campaignId: props.campaign.id,
        all: false,
        ids: [selected.id],
        filters: {}
      });
      removeCampaignHousingModal.close();
      setSelected(null);
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('rawAddress', {
        header: () => <AdvancedTableHeader title="Adresse logement" />,
        meta: {
          styles: {
            multiline: true
          }
        },
        cell: ({ cell, row }) => {
          return (
            <AppLink isSimple size="sm" to={`/logements/${row.original.id}`}>
              {cell.getValue().map((line, i) => (
                <Fragment key={i}>
                  {line}
                  <br />
                </Fragment>
              ))}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('owner.fullName', {
        header: () => <AdvancedTableHeader title="Propriétaire principal" />,
        meta: {
          styles: {
            multiline: true
          }
        },
        cell: ({ cell, row }) =>
          !row.original.owner ? null : (
            <AppLink
              isSimple
              size="sm"
              to={`/proprietaires/${row.original.owner.id}`}
            >
              {cell.getValue()}
            </AppLink>
          )
      }),
      columnHelper.accessor((row) => row.owner?.banAddress ?? null, {
        id: 'address',
        header: () => (
          <AdvancedTableHeader title="Adresse BAN du propriétaire" />
        ),
        cell: ({ cell }) => {
          const address = cell.getValue();
          return (
            <Stack direction="column" spacing={1} sx={{ alignItems: 'center' }}>
              {address ? formatAddress(address) : 'Non renseigné'}
              {address && !isBanEligible(address) ? (
                <Badge severity="info" small>
                  Adresse améliorable
                </Badge>
              ) : null}
            </Stack>
          );
        }
      }),
      columnHelper.accessor('owner.additionalAddress', {
        header: () => <AdvancedTableHeader title="Complément d’adresse" />,
        meta: {
          styles: {
            multiline: true
          }
        },
        cell: ({ cell }) => (
          <Typography variant="body2">{cell.getValue()}</Typography>
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <Typography variant="body2" sx={{ textAlign: 'end' }}>
            Actions
          </Typography>
        ),
        cell: ({ row }) => {
          if (!row.original.owner) {
            return null;
          }

          return (
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                priority="secondary"
                size="small"
                onClick={() => {
                  setSelected(row.original);
                  setEditing(true);
                }}
              >
                Éditer
              </Button>
              <Button
                iconId="fr-icon-close-line"
                priority="tertiary"
                size="small"
                title="Supprimer le destinataire"
                onClick={() => onRemove(row.original)}
              />
            </Stack>
          );
        }
      })
    ],
    []
  );

  return (
    <Stack>
      <Alert
        severity="info"
        title="Vos propriétaires destinataires"
        description={
          'Vérifiez les adresses des propriétaires, notamment dans les cas où l\'adresse BAN diffère de l\'adresse issue des Fichiers Fonciers (cas signalés par la mention "Adresse améliorable"). Une fois la liste des destinataires vérifiée, cliquez sur "Valider et passer au téléchargement" pour télécharger les destinataires au format XLSX.'
        }
        className="fr-mt-2w"
      />

      <AdvancedTable
        columns={columns}
        data={housings?.entities}
        isLoading={isLoading}
        manualPagination
        state={{ pagination }}
        pageCount={Math.ceil(filteredCount / pagination.pageSize)}
        tableProps={{ noCaption: true, size: 'lg' }}
        onPaginationChange={setPagination}
      />

      <OwnerEditionSideMenu
        owner={selected?.owner ?? null}
        isOpen={editing}
        onClose={() => {
          setEditing(false);
          setSelected(null);
        }}
      />

      <removeCampaignHousingModal.Component
        title="Suppression d’un destinataire"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w'
          },
          {
            children: 'Confirmer',
            onClick: confirmRemoval,
            doClosesModal: false
          }
        ]}
      >
        <Typography>
          Vous êtes sur le point de supprimer ce destinataire de la campagne.
        </Typography>
      </removeCampaignHousingModal.Component>
    </Stack>
  );
}

export default CampaignRecipients;
