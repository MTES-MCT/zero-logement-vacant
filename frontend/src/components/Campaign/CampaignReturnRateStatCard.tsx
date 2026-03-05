import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';

interface Props {
  campaign: CampaignDTO;
  returnRate: string | null;
}

const waitingState = (
  <Typography variant="body2" color="text.disabled">
    {`En attente de la date d'envoi`}
  </Typography>
);

function CampaignReturnRateStatCard({ campaign, returnRate }: Readonly<Props>) {
  const variant = campaign.sentAt ? 'default' : 'muted';

  return (
    <CampaignStatCard iconId="ri-discuss-line" label="Taux de retour" variant={variant}>
      {campaign.sentAt ? (
        <Typography variant="h6">{returnRate ?? '\u2014'}</Typography>
      ) : (
        waitingState
      )}
    </CampaignStatCard>
  );
}

export default CampaignReturnRateStatCard;
