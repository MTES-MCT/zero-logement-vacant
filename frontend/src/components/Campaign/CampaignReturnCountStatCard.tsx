import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';

interface Props {
  campaign: CampaignDTO;
  returnCount: number | null;
}

const waitingState = (
  <Typography variant="body2" color="text.disabled">
    {`En attente de la date d'envoi`}
  </Typography>
);

function CampaignReturnCountStatCard({ campaign, returnCount }: Readonly<Props>) {
  return (
    <CampaignStatCard iconId="ri-discuss-line" label="Nombre de retours">
      {campaign.sentAt ? (
        <Typography variant="h6">{returnCount ?? '\u2014'}</Typography>
      ) : (
        waitingState
      )}
    </CampaignStatCard>
  );
}

export default CampaignReturnCountStatCard;
