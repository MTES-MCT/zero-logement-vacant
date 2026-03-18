import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import Tooltip from '~/components/ui/Tooltip/Tooltip';

interface Props {
  campaign: CampaignDTO;
  housingCount: number;
}

function CampaignReturnRateStatCard(props: Readonly<Props>) {
  const { campaign, housingCount } = props;
  const variant = campaign.sentAt ? 'default' : 'muted';

  const returnCount = campaign.returnCount;
  const returnRate =
    campaign.sentAt && returnCount !== null && housingCount > 0
      ? `${Math.round((returnCount / housingCount) * 100)} %`
      : null;

  return (
    <CampaignStatCard
      iconId="ri-discuss-line"
      label="Taux de retour"
      variant={variant}
    >
      {campaign.sentAt ? (
        <Typography variant="h5" component="span">
          {returnRate}
        </Typography>
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
          <Tooltip title="Part de logements au sein de la campagne qui ont fait l’objet d’une mise à jour après la date d’envoi indiquée." />
        </Stack>
      )}
    </CampaignStatCard>
  );
}

export default CampaignReturnRateStatCard;
