import Badge from '@codegouvfr/react-dsfr/Badge';
import Table from '@codegouvfr/react-dsfr/Table';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { ReactNode } from 'react';

import { Campaign } from '../../models/Campaign';
import { useHousingList } from '../../hooks/useHousingList';
import { Address, addressToString, isBanEligible } from '../../models/Address';
import OwnerEditionSideMenu from '../OwnerEditionSideMenu/OwnerEditionSideMenu';
import AppLink from '../_app/AppLink/AppLink';
import { Housing } from '../../models/Housing';
import { useRemoveCampaignHousingMutation } from '../../services/campaign.service';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';

interface Props {
  campaign: Campaign;
}

function CampaignRecipients(props: Props) {
  const { housingList } = useHousingList({
    filters: {
      campaignIds: [props.campaign.id],
    },
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
    `# ${i}`,
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
      <Table data={data} headers={headers} />
    </Grid>
  );
}

export default CampaignRecipients;
