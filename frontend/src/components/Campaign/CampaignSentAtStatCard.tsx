import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { fr as dateFr } from 'date-fns/locale';
import type { CampaignDTO } from '@zerologementvacant/models';

import CampaignStatCard from '~/components/Campaign/CampaignStatCard';

interface Props {
  campaign: CampaignDTO;
  onOpenModal(): void;
}

function CampaignSentAtStatCard(props: Readonly<Props>) {
  const { campaign, onOpenModal } = props;
  const variant = campaign.sentAt ? 'default' : 'muted';

  return (
    <CampaignStatCard
      iconId="fr-icon-mail-send-line"
      label="Date d’envoi"
      variant={variant}
    >
      {campaign.sentAt ? (
        <Stack
          direction="row"
          spacing="0.5rem"
          useFlexGap
          sx={{ alignItems: 'center' }}
        >
          <Typography variant="h5" component="span">
            {format(new Date(campaign.sentAt), 'dd/MM/yyyy', {
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
            onClick={onOpenModal}
          />
        </Stack>
      ) : (
        <Button priority="secondary" size="small" onClick={onOpenModal}>
          Indiquer la date d’envoi
        </Button>
      )}
    </CampaignStatCard>
  );
}

export default CampaignSentAtStatCard;
