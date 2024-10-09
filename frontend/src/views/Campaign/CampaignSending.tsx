import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';
import { FormEvent, useEffect, useState } from 'react';

import { Campaign } from '../../models/Campaign';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import { useCampaign } from '../../hooks/useCampaign';
import DraftSendingDate, {
  sentAtSchema
} from '../../components/Draft/DraftSendingDate';
import { useForm } from '../../hooks/useForm';
import { object } from 'yup';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  useLazyGetCampaignQuery,
  useUpdateCampaignMutation
} from '../../services/campaign.service';
import { useNotification } from '../../hooks/useNotification';
import DraftDownloader from '../../components/Draft/DraftDownloader';
import CampaignCreatedFromGroup from '../../components/Campaign/CampaignCreatedFromGroup';
import config from '../../utils/config';
import styles from './campaign.module.scss';
import { Typography } from '@mui/material';
import Stepper from '@codegouvfr/react-dsfr/Stepper';

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
    <>
      <Grid className={styles.steps} xs={12} py={4}>
        <Grid container xsOffset={1}>
          <Grid xs={11}>
            <Stepper
                currentStep={2}
                stepCount={2}
                title="Téléchargement du fichier de publipostage (XLSX) et/ou de vos courriers rédigés (PDF)"
              />
              <p className={`fr-stepper__details ${styles.lastStep}`}>
                <span className="fr-text--bold">
                  Après l’étape de validation :
                </span>
                &nbsp;Suivi de campagne et passage de tous les logements &quot;Non
                suivi&quot; au statut &quot;En attente de retour&quot;.
              </p>
          </Grid>
          <Grid xs={11}>
            <div className={'float-right'}>
              <Button
                priority="primary"
                disabled={disabled}
                onClick={handleFormSubmit}
              >
                Valider la date d’envoi de votre campagne
              </Button>
            </div>
          </Grid>
        </Grid>
      </Grid>

      <Grid component="article" container xs={10} xsOffset={1}>
        <Grid component="header" mb={2} xs={12}>
          <Grid component="section" mb={2} xs={12}>
            <CampaignCreatedFromGroup campaign={props.campaign} />
          </Grid>
          <Grid component="section" xs={12}>
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
              <Grid xs={12} mt={2}>
                <h3 className="fr-mb-1w fr-text--md">Description</h3>
                <p>{props.campaign.description}</p>
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid component="section" container mb={5} xs={12}>
          {!hasFile ? (
            <Grid xs={6}>
              <Typography variant="h5" mb={2}>
                Vos fichiers à télécharger pour lancer votre campagne
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
            <Grid container mb={5} xs={6}>
              <Grid xs={12}>
                <Typography variant="h5" mb={2}>
                  Vos fichiers à télécharger pour lancer votre campagne
                </Typography>
              </Grid>
              <Grid xs={8}>
                <DraftDownloader
                  campaign={props.campaign}
                  setDownloaded={setDownloaded}
                />
              </Grid>
            </Grid>
          )}
          <Grid container xs={6} px={4}>
            <modal.Component
              title="Confirmation de la date d’envoi"
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
    </>
  );
}

export default CampaignSending;
