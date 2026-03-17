import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import CampaignCounts from '~/components/Campaign/CampaignCounts';
import CampaignCreatedFromGroup from '~/components/Campaign/CampaignCreatedFromGroup';
import CampaignRecipients from '~/components/Campaign/CampaignRecipients';
import CampaignTitle from '~/components/Campaign/CampaignTitle';
import SendButton from '~/components/Draft/SendButton';
import { useCampaign } from '~/hooks/useCampaign';
import type { Campaign } from '~/models/Campaign';
import { useUpdateCampaignMutation } from '~/services/campaign.service';
import CampaignDraftContent from './CampaignDraftContent';
import DraftFormProvider, { useDraftForm } from './DraftFormProvider';
import styles from './campaign.module.scss';

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Readonly<Props>) {
  return (
    <DraftFormProvider campaignId={props.campaign.id}>
      <CampaignDraftInner campaign={props.campaign} />
    </DraftFormProvider>
  );
}

function CampaignDraftInner(props: Readonly<Props>) {
  const { count, countHousingQuery } = useCampaign();
  const { form, save } = useDraftForm();

  const [updateCampaign] = useUpdateCampaignMutation();

  async function send(): Promise<void> {
    // Save the draft first (creates it if it doesn't exist)
    await save();
    // Then update the campaign status
    await updateCampaign({ ...props.campaign, status: 'sending' });
  }

  return (
    <Container sx={{ py: 4, position: 'relative' }} maxWidth="xl">
      <Stack sx={{ mb: 4 }}>
        <Stepper
          currentStep={1}
          nextTitle="Téléchargement des fichiers et validation de la date d'envoi"
          stepCount={2}
          title="Vérification des adresses propriétaires et édition de votre courrier"
        />
        <Box sx={{ alignSelf: 'flex-end' }}>
          <SendButton form={form} onSend={send} />
        </Box>
      </Stack>

      <hr />

      <Grid component="article" container>
        <Grid
          alignItems="center"
          container
          component="header"
          mb={5}
          size="grow"
        >
          <Grid mb={2} size={12}>
            <CampaignCreatedFromGroup campaign={props.campaign} />
          </Grid>
          <CampaignTitle
            as="h2"
            campaign={props.campaign}
            className="fr-mb-1w"
          />
          <Grid size={6}>
            <CampaignCounts housing={count?.housing ?? null} owners={count?.owners ?? null} isLoading={countHousingQuery.isLoading} />
          </Grid>
          {props.campaign.description && (
            <Grid mt={2} size={12}>
              <h3 className="fr-mb-1w fr-text--md">Description</h3>
              <p>{props.campaign.description}</p>
            </Grid>
          )}
        </Grid>
        <Tabs
          className={styles.tabs}
          classes={{
            panel: styles.panel
          }}
          tabs={[
            {
              label: 'Destinataires',
              content: <CampaignRecipients campaign={props.campaign} />
            },
            {
              label: 'Courrier',
              content: <CampaignDraftContent />
            }
          ]}
        />
      </Grid>
    </Container>
  );
}

export default CampaignDraft;
