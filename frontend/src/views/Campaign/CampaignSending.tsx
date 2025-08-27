import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FormEvent, useEffect, useState } from 'react';

import Container from '@mui/material/Container';
import { object } from 'yup-deprecated';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import CampaignCreatedFromGroup from '../../components/Campaign/CampaignCreatedFromGroup';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import DraftDownloader from '../../components/Draft/DraftDownloader';
import DraftSendingDate, {
  sentAtSchema
} from '../../components/Draft/DraftSendingDate';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import { useNotification } from '../../hooks/useNotification';
import { Campaign } from '../../models/Campaign';
import {
  useLazyGetCampaignQuery,
  useUpdateCampaignMutation
} from '../../services/campaign.service';
import config from '../../utils/config';
import styles from './campaign.module.scss';

const modal = createModal({
  id: 'campaign-sending-modal',
  isOpenedByDefault: false
});

const schema = object({
  sentAt: sentAtSchema
});

interface Props {
  campaign: Campaign;
}

function CampaignSending(props: Readonly<Props>) {
  const [sentAt, setSentAt] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const { count } = useCampaign();
  const [updateCampaign, mutation] = useUpdateCampaignMutation();

  const form = useForm(schema, {
    sentAt
  });

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'update-sending-date'
  });

  const hasFile = !!props.campaign.file;
  const disabled = !hasFile || !sentAt;

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    modal.open();
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    form.validate(() => {
      updateCampaign({
        ...props.campaign,
        sentAt,
        status: 'in-progress'
      });
    });
    modal.close();
  }

  const [getCampaign] = useLazyGetCampaignQuery();
  useEffect(() => {
    if (!hasFile) {
      const sse = new EventSource(`${config.apiEndpoint}/api/sse`);
      sse.addEventListener('campaign-generate', (event) => {
        const { id } = JSON.parse(event.data);
        getCampaign(id);
      });

      return () => sse.close();
    }
  }, [getCampaign, hasFile]);

  return (
    <Container sx={{ py: 4, position: 'relative' }} maxWidth="xl">
      <Stack sx={{ mb: 4 }}>
        <Stepper
          currentStep={2}
          stepCount={2}
          title="Téléchargement des fichiers et validation de la date d’envoi"
        />
        <p className={`fr-stepper__details ${styles.lastStep}`}>
          <span className="fr-text--bold">Après l’étape de validation :</span>
          &nbsp;Suivi de campagne et passage de tous les logements &quot;Non
          suivi&quot; au statut &quot;En attente de retour&quot;.
        </p>
        <Box sx={{ alignSelf: 'flex-end' }}>
          <Button
            priority="primary"
            disabled={disabled}
            onClick={handleFormSubmit}
          >
            Enregistrer et passer au suivi
          </Button>
        </Box>
      </Stack>

      <hr />

      <Grid component="article" container size={10} offset={1}>
        <Grid component="header" mb={2} size={12}>
          <Grid component="section" mb={2} size={12}>
            <CampaignCreatedFromGroup campaign={props.campaign} />
          </Grid>
          <Grid component="section" size={12}>
            <CampaignTitle
              as="h2"
              campaign={props.campaign}
              className="fr-mb-1w"
            />
            <CampaignCounts
              display="row"
              housing={count?.housing}
              owners={count?.owners}
            />
            {props.campaign.description && (
              <Grid mt={2} size={12}>
                <h3 className="fr-mb-1w fr-text--md">Description</h3>
                <p>{props.campaign.description}</p>
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid component="section" container mb={5} size={12}>
          {!hasFile ? (
            <Grid size={6}>
              <Typography variant="h5" mb={2}>
                1. Téléchargez vos fichiers
              </Typography>
              <Box sx={{ width: '100%' }}>
                <LinearProgress color="info" />
                <Alert
                  className="fr-mb-5w"
                  description="Vous pouvez quitter cette page et revenir télécharger vos courriers ici dès que le fichier sera prêt. Si vous n'avez toujours pas accès au téléchargement après 24 heures, contactez-nous via le chat en bas à droite de la page."
                  severity="info"
                  title="Chargement des fichiers en cours (destinataires au format XLSX et courriers au format PDF)"
                />
              </Box>
            </Grid>
          ) : (
            <Grid container mb={5} size={6}>
              <Grid size={12}>
                <Typography variant="h5" mb={2}>
                  1. Téléchargez vos fichiers
                </Typography>
              </Grid>
              <Grid size={8}>
                <DraftDownloader
                  campaign={props.campaign}
                  setDownloaded={setDownloaded}
                />
              </Grid>
            </Grid>
          )}
          <Grid container px={4} size={6}>
            <modal.Component
              title="Enregistrer et passer au suivi"
              buttons={[
                {
                  children: 'Annuler',
                  className: 'fr-mr-2w',
                  priority: 'secondary'
                },
                {
                  onClick: submit,
                  children: 'Confirmer',
                  doClosesModal: false
                }
              ]}
            >
              <div className="fr-alert fr-alert--warning fr-alert--sm">
                <p>
                  Une fois la date d’envoi confirmée, vous ne pourrez plus
                  télécharger vos courriers et vos destinataires. Si vous avez
                  bien effectué le téléchargement, vous pouvez cliquer sur
                  “Confirmer” et commencer le suivi de votre campagne. Sinon,
                  cliquez sur “Annuler” pour revenir en arrière et télécharger
                  les courriers et destinataires avant de confirmer.
                </p>
              </div>
            </modal.Component>
            <form>
              <DraftSendingDate
                className="fr-mb-5w"
                form={form}
                value={sentAt}
                onChange={setSentAt}
                disabled={!downloaded}
              />
            </form>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default CampaignSending;
