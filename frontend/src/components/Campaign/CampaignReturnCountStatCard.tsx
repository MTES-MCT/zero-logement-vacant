import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';

interface Props {
  campaign: CampaignDTO;
  returnCount: number | null;
}

function CampaignReturnCountStatCard({ campaign, returnCount }: Readonly<Props>) {
  const variant = campaign.sentAt ? 'default' : 'muted';

  return (
    <CampaignStatCard
      iconId="ri-discuss-line"
      label="Nombre de retours"
      variant={variant}
    >
      {campaign.sentAt ? (
        <Typography variant="h6">{returnCount}</Typography>
      ) : (
        <Typography variant="body2">En attente de la date d’envoi</Typography>
      )}
    </CampaignStatCard>
  );
}

export default CampaignReturnCountStatCard;
