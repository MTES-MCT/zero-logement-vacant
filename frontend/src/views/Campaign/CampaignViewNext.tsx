import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';

import CampaignCreatedFromGroup from '~/components/Campaign/CampaignCreatedFromGroup';
import CampaignRecipients from '~/components/Campaign/CampaignRecipients';
import CampaignReturnCountStatCard from '~/components/Campaign/CampaignReturnCountStatCard';
import CampaignReturnRateStatCard from '~/components/Campaign/CampaignReturnRateStatCard';
import CampaignSentAtModal from '~/components/Campaign/CampaignSentAtModal';
import CampaignSentAtStatCard from '~/components/Campaign/CampaignSentAtStatCard';
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
      loading: 'Suppression en cours...',
      success: 'Campagne supprimée !'
    }
  });

  async function handleDelete(): Promise<void> {
    if (!campaign) return;
    await removeCampaign(campaign.id).unwrap();
    navigate('/campagnes');
  }

  async function handleSentAtConfirm(isoDate: string): Promise<void> {
    if (!campaign) return;
    await updateCampaign({
      ...campaign,
      sentAt: new Date(isoDate).toJSON()
    });
  }

  if (isLoading || !campaign) return null;

  const returnCount = campaign.returnCount;
  const returnRate =
    campaign.sentAt && returnCount !== null && housingCount > 0
      ? `${Math.round((returnCount / housingCount) * 100)}\u00a0%`
      : null;

  return (
    <Container maxWidth={false} sx={{ py: '1.5rem' }}>
      <Stack spacing="2rem">
        <Stack
          component="header"
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing="1rem"
          useFlexGap
        >
          <Stack spacing="0.5rem">
            <Breadcrumb
              currentPageLabel={campaign.title}
              segments={[
                { label: 'Campagnes', linkProps: { href: '/campagnes' } }
              ]}
            />
            <CampaignTitle as="h1" look="h4" campaign={campaign} />
            {campaign.description && (
              <Stack spacing="0.25rem">
                <Typography component="label" variant="h6">
                  Description
                </Typography>
                <Typography sx={{ fontStyle: 'italic' }}>
                  {campaign.description}
                </Typography>
              </Stack>
            )}
            <CampaignCreatedFromGroup campaign={campaign} />
          </Stack>

          <Button
            iconId="fr-icon-delete-line"
            priority="tertiary"
            onClick={handleDelete}
          >
            Supprimer la campagne
          </Button>
        </Stack>

        {/* Metrics */}
        <Stack direction="row" spacing="0.75rem" useFlexGap>
          <CampaignStatCard
            iconId="fr-icon-building-line"
            label="Nombre de logements"
          >
            <Typography variant="h6">{housingCount}</Typography>
          </CampaignStatCard>

          <CampaignStatCard
            iconId="fr-icon-group-fill"
            label="Nombre de propriétaires"
          >
            <Typography variant="h6">{count?.owners ?? '\u2014'}</Typography>
          </CampaignStatCard>

          <CampaignSentAtStatCard campaign={campaign} />
          <CampaignReturnCountStatCard campaign={campaign} returnCount={returnCount} />
          <CampaignReturnRateStatCard campaign={campaign} returnRate={returnRate} />
        </Stack>

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
    </Container>
  );
}

export default CampaignViewNext;
