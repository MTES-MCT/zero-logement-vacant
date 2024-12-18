import Alert from '@codegouvfr/react-dsfr/Alert';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { createColumnHelper } from '@tanstack/react-table';
import { ReactNode, useMemo, useState } from 'react';

import {
  formatAddress as formatAddressDTO,
  Pagination
} from '@zerologementvacant/models';
import { Campaign } from '../../models/Campaign';
import { Address, isBanEligible } from '../../models/Address';
import AppLink from '../_app/AppLink/AppLink';
import { Housing } from '../../models/Housing';
import { useRemoveCampaignHousingMutation } from '../../services/campaign.service';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { usePagination } from '../../hooks/usePagination';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../../services/housing.service';
import AdvancedTable from '../AdvancedTable/AdvancedTable';
import AdvancedTableHeader from '../AdvancedTable/AdvancedTableHeader';
import OwnerEditionSideMenu from '../OwnerEditionSideMenu/OwnerEditionSideMenu';
import { useNotification } from '../../hooks/useNotification';

interface Props {
  campaign: Campaign;
}

const removeCampaignHousingModal = createModal({
  id: 'remove-campaign-housing-modal',
  isOpenedByDefault: false
});
const columnHelper = createColumnHelper<Housing>();

function CampaignRecipients(props: Props) {
  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const filters = {
    campaignIds: [props.campaign.id]
  };
  const { data: housings, isLoading } = useFindHousingQuery({
    filters,
    pagination
  });
  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  const { page, perPage, pageCount, changePerPage, changePage } = usePagination(
    {
      pagination,
      setPagination,
      count: filteredCount
    }
  );

  function formatAddress(address: Address): ReactNode[] {
    return formatAddressDTO(address).map((line) => (
      <Typography key={line} variant="body2">
        {line}
      </Typography>
    ));
  }

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
        cell: ({ cell, row }) => {
          return (
            <AppLink isSimple size="sm" to={`/logements/${row.original.id}`}>
              {cell.getValue().map((line) => (
                <>
                  {line}
                  <br />
                </>
              ))}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('owner.fullName', {
        header: () => <AdvancedTableHeader title="Propriétaire principal" />,
        cell: ({ cell, row }) => (
          <AppLink
            isSimple
            size="sm"
            to={`/proprietaires/${row.original.owner.id}`}
          >
            {cell.getValue()}
          </AppLink>
        )
      }),
      columnHelper.accessor('owner.banAddress', {
        header: () => (
          <AdvancedTableHeader title="Adresse BAN du propriétaire" />
        ),
        cell: ({ cell }) => {
          const address = cell.getValue();
          return (
            <Stack direction="column" spacing={1} sx={{ alignItems: 'center' }}>
              {address ? formatAddress(address) : 'Non renseigné'}
              {housing.owner.banAddress && !isBanEligible(address) ? (
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
          return (
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'flex-end' }}
            >
              <OwnerEditionSideMenu owner={row.original.owner} />
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
    <Grid container>
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
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        tableProps={{ bordered: true, fixed: true, noCaption: true }}
        onPageChange={changePage}
        onPerPageChange={changePerPage}
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
    </Grid>
  );
}

export default CampaignRecipients;
