import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Container from '@mui/material/Container';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';

import CampaignCreatedFromGroupNext from '~/components/Campaign/CampaignCreatedFromGroupNext';
import { createCampaignDeleteModal } from '~/components/Campaign/CampaignDeleteModal';
import CampaignRecipientsNext from '~/components/Campaign/CampaignRecipientsNext';
import CampaignReturnCountStatCard from '~/components/Campaign/CampaignReturnCountStatCard';
import CampaignReturnRateStatCard from '~/components/Campaign/CampaignReturnRateStatCard';
import { createCampaignSentAtModal } from '~/components/Campaign/CampaignSentAtModal';
import CampaignSentAtStatCard from '~/components/Campaign/CampaignSentAtStatCard';
import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import CampaignTitle from '~/components/Campaign/CampaignTitle';
import DraftForm from '~/components/Draft/DraftForm';
import { useGetCampaignDraftQuery } from '~/hooks/useGetCampaignDraftQuery';
import { useNotification } from '~/hooks/useNotification';
import {
  useGetCampaignQuery,
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '~/services/campaign.service';
import { useCountHousingQuery } from '~/services/housing.service';

const campaignDeleteModal = createCampaignDeleteModal();
const sentAtModal = createCampaignSentAtModal();

function CampaignViewNext() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useGetCampaignQuery(id as string);
  const { data: count } = useCountHousingQuery({ campaignIds: [id as string] });
  const housingCount = count?.housing ?? 0;
  const getCampaignDraftQuery = useGetCampaignDraftQuery(id as string);

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

  async function onRemoveCampaign(): Promise<void> {
    if (!campaign) return;
    await removeCampaign(campaign.id).unwrap();
    navigate('/campagnes');
  }

  async function updateSentAt(date: string): Promise<void> {
    if (!campaign) return;

    await updateCampaign({
      ...campaign,
      sentAt: date
    });
  }

  if (isLoading || !campaign) return null;

  return (
    <Container maxWidth={false} sx={{ py: '1.5rem' }}>
      <Stack spacing="2rem" useFlexGap>
        <Stack
          component="header"
          direction={{ xs: 'column-reverse', md: 'row' }}
          justifyContent="space-between"
          alignItems="flex-start"
          spacing="1rem"
          useFlexGap
        >
          <Stack component="section" spacing="0.75rem" useFlexGap>
            <Breadcrumb
              className="fr-m-0"
              currentPageLabel={campaign.title}
              segments={[
                { label: 'Campagnes', linkProps: { href: '/campagnes' } }
              ]}
            />
            <CampaignTitle
              className="fr-mt-0"
              as="h1"
              look="h4"
              campaign={campaign}
            />

            {campaign.description && (
              <Stack spacing="0.5rem" useFlexGap>
                <Typography component="p" variant="h6">
                  Description
                </Typography>
                <Typography sx={{ fontStyle: 'italic' }}>
                  {campaign.description}
                </Typography>
              </Stack>
            )}

            <CampaignCreatedFromGroupNext campaign={campaign} />
          </Stack>

          <Button
            iconId="fr-icon-delete-line"
            priority="tertiary"
            onClick={() => campaignDeleteModal.open()}
          >
            Supprimer la campagne
          </Button>
        </Stack>

        {/* Metrics */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing="0.75rem"
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          <CampaignStatCard
            iconId="fr-icon-building-line"
            label="Nombre de logements"
          >
            <Typography variant="h5" component="p">
              {housingCount}
            </Typography>
          </CampaignStatCard>

          <CampaignStatCard
            iconId="fr-icon-group-line"
            label="Nombre de propriétaires"
          >
            <Typography variant="h5" component="p">
              {count?.owners}
            </Typography>
          </CampaignStatCard>

          <CampaignSentAtStatCard
            campaign={campaign}
            onOpenModal={sentAtModal.open}
          />
          <CampaignReturnCountStatCard campaign={campaign} />
          <CampaignReturnRateStatCard campaign={campaign} />
        </Stack>

        <Tabs
          tabs={[
            {
              label: 'Destinataires',
              content: <CampaignRecipientsNext campaign={campaign} />
            },
            {
              label: 'Courrier',
              content:
                getCampaignDraftQuery.isSuccess &&
                getCampaignDraftQuery.data ? (
                  <DraftForm
                    campaign={campaign}
                    draft={getCampaignDraftQuery.data}
                  />
                ) : null
            }
          ]}
        />

        <sentAtModal.Component
          sentAt={campaign.sentAt ?? null}
          onConfirm={updateSentAt}
        />
        <campaignDeleteModal.Component onSubmit={onRemoveCampaign} />
      </Stack>
    </Container>
  );
}

export default CampaignViewNext;
