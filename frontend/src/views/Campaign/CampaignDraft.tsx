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
import { useForm } from '~/hooks/useForm';
import type { Campaign } from '~/models/Campaign';
import { useUpdateCampaignMutation } from '~/services/campaign.service';
import * as yup from 'yup';
import { senderSchema } from '~/components/Draft/DraftSender';
import { writtenSchema } from '~/components/Draft/DraftMailInfo';
import CampaignDraftContent from './CampaignDraftContent';
import styles from './campaign.module.scss';

const schema = yup
  .object({
    subject: yup.string().default(undefined),
    body: yup.string().default(undefined),
    sender: senderSchema
  })
  .concat(writtenSchema)
  .required();

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Readonly<Props>) {
  const { count, countHousingQuery } = useCampaign();

  const form = useForm(schema as any, {
    subject: '',
    body: '',
    sender: {
      name: '',
      service: '',
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      signatories: [null, null]
    },
    writtenAt: '',
    writtenFrom: ''
  });

  const [updateCampaign] = useUpdateCampaignMutation();
  async function send(): Promise<void> {
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
              content: <CampaignDraftContent campaign={props.campaign} />
            }
          ]}
        />
      </Grid>
    </Container>
  );
}

export default CampaignDraft;
