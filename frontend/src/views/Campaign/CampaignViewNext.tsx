import { fr } from '@codegouvfr/react-dsfr';
import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { fr as dateFr } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

import CampaignCreatedFromGroup from '~/components/Campaign/CampaignCreatedFromGroup';
import CampaignRecipients from '~/components/Campaign/CampaignRecipients';
import CampaignSentAtModal, { sentAtModal } from '~/components/Campaign/CampaignSentAtModal';
import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import CampaignTitle from '~/components/Campaign/CampaignTitle';
import { useNotification } from '~/hooks/useNotification';
import {
  useGetCampaignQuery,
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '~/services/campaign.service';
import { useCountHousingQuery } from '~/services/housing.service';
import CampaignDraftContent from './CampaignDraftContent';

const MetricsStrip = styled(Stack)({
  border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
  borderRadius: '0.25rem'
});

function CampaignViewNext() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useGetCampaignQuery(id as string);
  const { data: count } = useCountHousingQuery({ campaignIds: [id as string] });
  const housingCount = count?.housing ?? 0;

  const [updateCampaign] = useUpdateCampaignMutation();
  const [removeCampaign, removeMutation] = useRemoveCampaignMutation();

  useNotification({
    toastId: 'remove-campaign',
    isError: removeMutation.isError,
    isLoading: removeMutation.isLoading,
    isSuccess: removeMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression de la campagne',
      loading: 'Suppression en cours\u2026',
      success: 'Campagne supprim\u00e9e'
    }
  });

  async function handleDelete(): Promise<void> {
    if (!campaign) return;
    await removeCampaign(campaign.id).unwrap();
    navigate('/campagnes');
  }

  async function handleSentAtConfirm(isoDate: string): Promise<void> {
    if (!campaign) return;
    await updateCampaign({ ...campaign, sentAt: new Date(isoDate).toJSON() });
  }

  if (isLoading || !campaign) return null;

  const returnCount = campaign.returnCount;
  const returnRate =
    campaign.sentAt && returnCount !== null && housingCount > 0
      ? `${Math.round((returnCount / housingCount) * 100)}\u00a0%`
      : null;

  return (
    <Stack spacing="2rem" sx={{ px: '1.5rem', py: '2rem', maxWidth: '87rem', mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing="0.5rem">
          <Breadcrumb
            currentPageLabel={campaign.title}
            homeLinkProps={{ href: '/' }}
            segments={[{ label: 'Campagnes', linkProps: { href: '/campagnes' } }]}
          />
          <CampaignTitle as="h1" campaign={campaign} />
          {campaign.description && (
            <Stack spacing="0.25rem">
              <Typography variant="subtitle2">Description</Typography>
              <Typography>{campaign.description}</Typography>
            </Stack>
          )}
          <CampaignCreatedFromGroup campaign={campaign} />
        </Stack>
        <Button
          iconId="fr-icon-delete-line"
          priority="tertiary no outline"
          onClick={handleDelete}
        >
          Supprimer la campagne
        </Button>
      </Stack>

      {/* Metrics */}
      <MetricsStrip direction="row">
        <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
          <Typography variant="h6">{housingCount}</Typography>
        </CampaignStatCard>

        <CampaignStatCard iconId="fr-icon-group-fill" label="Nombre de propri\u00e9taires">
          <Typography variant="h6">{count?.owners ?? '\u2014'}</Typography>
        </CampaignStatCard>

        <CampaignStatCard iconId="fr-icon-mail-send-line" label="Date d\u2019envoi">
          {campaign.sentAt ? (
            <Stack direction="row" alignItems="center" spacing="0.5rem">
              <Typography>
                {format(new Date(campaign.sentAt), 'd MMMM yyyy', { locale: dateFr })}
              </Typography>
              <Button
                iconId="fr-icon-edit-line"
                priority="tertiary no outline"
                size="small"
                title="Modifier la date d\u2019envoi"
                onClick={() => sentAtModal.open()}
              />
            </Stack>
          ) : (
            <Button priority="secondary" size="small" onClick={() => sentAtModal.open()}>
              {`Indiquer la date d\u2019envoi`}
            </Button>
          )}
        </CampaignStatCard>

        <CampaignStatCard iconId="ri-discuss-line" label="Nombre de retours">
          {campaign.sentAt ? (
            <Typography variant="h6">{returnCount ?? '\u2014'}</Typography>
          ) : (
            <WaitingState />
          )}
        </CampaignStatCard>

        <CampaignStatCard iconId="ri-discuss-line" label="Taux de retour">
          {campaign.sentAt ? (
            <Typography variant="h6">{returnRate ?? '\u2014'}</Typography>
          ) : (
            <WaitingState />
          )}
        </CampaignStatCard>
      </MetricsStrip>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            label: 'Destinataires',
            content: <CampaignRecipients campaign={campaign} />
          },
          {
            label: 'Courrier',
            content: <CampaignDraftContent campaign={campaign} />
          }
        ]}
      />

      <CampaignSentAtModal
        defaultValue={campaign.sentAt?.slice(0, 10)}
        onConfirm={handleSentAtConfirm}
      />
    </Stack>
  );
}

function WaitingState() {
  return (
    <Typography variant="body2" color="text.disabled">
      {`En attente de la date d\u2019envoi`}
    </Typography>
  );
}

export default CampaignViewNext;
