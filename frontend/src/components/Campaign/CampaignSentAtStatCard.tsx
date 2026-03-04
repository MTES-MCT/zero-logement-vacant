import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { fr as dateFr } from 'date-fns/locale';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import { sentAtModal } from '~/components/Campaign/CampaignSentAtModal';

interface Props {
  campaign: CampaignDTO;
}

function CampaignSentAtStatCard({ campaign }: Readonly<Props>) {
  return (
    <CampaignStatCard iconId="fr-icon-mail-send-line" label="Date d’envoi">
      {campaign.sentAt ? (
        <Stack direction="row" alignItems="center" spacing="0.5rem">
          <Typography>
            {format(new Date(campaign.sentAt), 'd MMMM yyyy', {
              locale: dateFr
            })}
          </Typography>
          <Button
            iconId="fr-icon-edit-line"
            priority="tertiary no outline"
            size="small"
            title="Modifier la date d’envoi"
            nativeButtonProps={{
              'aria-label': 'Modifier la date d’envoi'
            }}
            onClick={() => sentAtModal.open()}
          />
        </Stack>
      ) : (
        <Button
          priority="secondary"
          size="small"
          onClick={() => sentAtModal.open()}
        >
          Indiquer la date d’envoi
        </Button>
      )}
    </CampaignStatCard>
  );
}

export default CampaignSentAtStatCard;
