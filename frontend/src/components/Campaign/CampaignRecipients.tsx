import Button from '@codegouvfr/react-dsfr/Button';
import Table from '@codegouvfr/react-dsfr/Table';
import Grid from '@mui/material/Unstable_Grid2';
import React, { ReactNode } from 'react';

import { Campaign } from '../../models/Campaign';
import { useHousingList } from '../../hooks/useHousingList';
import { addressToString } from '../../models/Address';
import OwnerEditionSideMenu from '../OwnerEditionSideMenu/OwnerEditionSideMenu';
import AppLink from '../_app/AppLink/AppLink';
import { Housing } from '../../models/Housing';
import { useRemoveCampaignHousingMutation } from '../../services/campaign.service';

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
    <AppLink isSimple to={`/logements/${housing.id}`}>
      {housing.rawAddress.map((line) => (
        <>
          {line}
          <br />
        </>
      ))}
    </AppLink>,
    <AppLink isSimple to={`/proprietaires/${housing.owner.id}`}>
      {housing.owner.fullName}
    </AppLink>,
    addressToString(housing.owner.banAddress),
    housing.owner.additionalAddress,
    <Grid container>
      <OwnerEditionSideMenu className="fr-mr-1w" owner={housing.owner} />
      <Button
        iconId="fr-icon-close-line"
        priority="tertiary"
        size="small"
        title="Supprimer le propriétaire"
        onClick={() => removeHousing(housing)}
      />
    </Grid>,
  ]);

  return (
    <Grid container>
      <Table data={data} headers={headers} />
    </Grid>
  );
}

export default CampaignRecipients;
