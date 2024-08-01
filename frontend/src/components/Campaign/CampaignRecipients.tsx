import Badge from '@codegouvfr/react-dsfr/Badge';
import Table from '@codegouvfr/react-dsfr/Table';
import { Pagination as DSFRPagination } from '../_dsfr';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { ReactNode, useState } from 'react';

import { Campaign } from '../../models/Campaign';
import { useHousingList } from '../../hooks/useHousingList';
import { Address, addressToString, isBanEligible } from '../../models/Address';
import OwnerEditionSideMenu from '../OwnerEditionSideMenu/OwnerEditionSideMenu';
import AppLink from '../_app/AppLink/AppLink';
import { Housing } from '../../models/Housing';
import { useRemoveCampaignHousingMutation } from '../../services/campaign.service';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { Pagination } from '@zerologementvacant/models';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { usePagination } from '../../hooks/usePagination';
import Button from '@codegouvfr/react-dsfr/Button';
import { useCountHousingQuery } from '../../services/housing.service';
import Alert from '@codegouvfr/react-dsfr/Alert';

interface Props {
  campaign: Campaign;
}

function CampaignRecipients(props: Props) {
  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const filters = {
    campaignIds: [props.campaign.id],
  };
  const { housingList } = useHousingList({
    filters,
    pagination,
  });

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  const { pageCount, hasPagination, changePerPage, changePage} = usePagination({
    pagination,
    setPagination,
    count: filteredCount,
  });

  const [removeCampaignHousing] = useRemoveCampaignHousingMutation();
  function removeHousing(housing: Housing): void {
    removeCampaignHousing({
      campaignId: props.campaign.id,
      all: false,
      ids: [housing.id],
      filters: {},
    });
  }

  function formatAddress(address: Address): ReactNode[] {
    return (addressToString(address) as string)
      .split('\n')
      .map((line) => <Typography key={line}>{line}</Typography>);
  }

  const headers: ReactNode[] = [
    null,
    'Adresse du logement',
    'Propriétaire principal',
    'Adresse BAN du propriétaire',
    'Complément d’adresse',
    null,
  ];
  const data: ReactNode[][] = (housingList ?? []).map((housing, i) => [
    `# ${i + 1 + (pagination.page - 1) * pagination.perPage}`,
    <AppLink
      isSimple
      key={`${housing.id}-address`}
      to={`/logements/${housing.id}`}
    >
      {housing.rawAddress.map((line) => (
        <>
          {line}
          <br />
        </>
      ))}
    </AppLink>,
    <AppLink
      isSimple
      key={`${housing.id}-name`}
      to={`/proprietaires/${housing.owner.id}`}
    >
      {housing.owner.fullName}
    </AppLink>,
    <>
      {housing.owner.banAddress
        ? formatAddress(housing.owner.banAddress)
        : null}
      {!isBanEligible(housing.owner.banAddress) && (
        <Badge severity="info" small>
          Adresse améliorable
        </Badge>
      )}
    </>,
    housing.owner.additionalAddress,
    <Grid container key={`${housing.id}-actions`}>
      <OwnerEditionSideMenu className="fr-mr-1w" owner={housing.owner} />
      <ConfirmationModal
        modalId="campaign-recipient-removal"
        openingButtonProps={{
          iconId: 'fr-icon-close-line',
          priority: 'tertiary',
          size: 'small',
          title: 'Supprimer le propriétaire',
        }}
        title="Suppression d’un propriétaire"
        onSubmit={() => removeHousing(housing)}
      >
        <Typography>
          Vous êtes sur le point de supprimer ce destinataire de la campagne.
        </Typography>
      </ConfirmationModal>
    </Grid>,
  ]);

  return (
    <Grid container>
      <Alert
        severity="info"
        closable
        title="Vos propriétaires destinataires"
        description={'Vérifiez les adresses des propriétaires, notamment dans les cas où l\'adresse BAN diffère de l\'adresse issue des Fichiers Fonciers (cas signalés par la mention "Adresse améliorable"). Une fois la liste des destinataires vérifiée, cliquez sur "Valider et passer au téléchargement" pour télécharger les destinataires au format XLSX.'}
        className="fr-mt-2w"
      />
      <Table data={data} headers={headers} />
      {hasPagination && (
        <>
          <div className="fr-react-table--pagination-center nav">
            <DSFRPagination
              onClick={changePage}
              currentPage={pagination.page}
              pageCount={pageCount}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Button
              onClick={() => changePerPage(50)}
              priority="secondary"
              disabled={pagination.perPage === 50}
              title="Afficher 50 résultats par page"
            >
              50 résultats par page
            </Button>
            <Button
              onClick={() => changePerPage(200)}
              className="fr-mx-3w"
              priority="secondary"
              disabled={pagination.perPage === 200}
              title="Afficher 200 résultats par page"
            >
              200 résultats par page
            </Button>
            <Button
              onClick={() => changePerPage(500)}
              priority="secondary"
              disabled={pagination.perPage === 500}
              title="Afficher 500 résultats par page"
            >
              500 résultats par page
            </Button>
          </div>
        </>
      )}
    </Grid>
  );
}

export default CampaignRecipients;
