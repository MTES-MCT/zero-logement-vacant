import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import Tooltip from '~/components/ui/Tooltip/Tooltip';

interface Props {
  campaign: CampaignDTO;
  returnCount: number | null;
}

function CampaignReturnCountStatCard({
  campaign,
  returnCount
}: Readonly<Props>) {
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
        <Stack
          direction="row"
          spacing="0.25rem"
          useFlexGap
          sx={{ alignItems: 'center' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            En attente de la date d’envoi
          </Typography>
          <Tooltip title="Nombre de logements au sein de la campagne qui ont fait l’objet d’une mise à jour après la date d’envoi indiquée." />
        </Stack>
      )}
    </CampaignStatCard>
  );
}

export default CampaignReturnCountStatCard;
