import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import Tooltip from '~/components/ui/Tooltip/Tooltip';

interface Props {
  campaign: CampaignDTO;
}

function CampaignReturnCountStatCard(props: Readonly<Props>) {
  const { campaign } = props;
  const variant = campaign.sentAt ? 'default' : 'muted';

  return (
    <CampaignStatCard
      iconId="ri-discuss-line"
      label="Nombre de retours"
      variant={variant}
    >
      <Stack
        direction="row"
        spacing="0.25rem"
        useFlexGap
        sx={{ alignItems: 'center' }}
      >
        {campaign.sentAt ? (
          <Typography
            variant="h5"
            component="span"
            aria-label={`Nombre de retours : ${campaign.returnCount}`}
          >
            {campaign.returnCount}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            En attente de la date d’envoi
          </Typography>
        )}
        <Tooltip title="Nombre de logements au sein de la campagne qui ont fait l’objet d’une mise à jour après la date d’envoi indiquée." />
      </Stack>
    </CampaignStatCard>
  );
}

export default CampaignReturnCountStatCard;
