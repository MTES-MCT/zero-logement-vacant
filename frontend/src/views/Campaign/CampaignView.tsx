import Grid from '@mui/material/Grid';

import CampaignInProgress from './CampaignInProgress';
import { useCampaign } from '../../hooks/useCampaign';
import CampaignDraft from './CampaignDraft';
import CampaignSending from './CampaignSending';
import { CampaignStatus } from '@zerologementvacant/models';
import NotFoundView from '../NotFoundView';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function CampaignView() {
  const { campaign, isLoadingCampaign } = useCampaign();
  useDocumentTitle(
    campaign ? `Campagne - ${campaign.title}` : 'Page non trouvée'
  );

  if (isLoadingCampaign) {
    return <Loading />;
  }

  if (!campaign) {
    return <NotFoundView />;
  }

  const steps: Record<CampaignStatus, JSX.Element> = {
    draft: <CampaignDraft campaign={campaign} />,
    sending: <CampaignSending campaign={campaign} />,
    'in-progress': <CampaignInProgress campaign={campaign} />,
    archived: <CampaignInProgress campaign={campaign} />
  };
  const CampaignComponent = steps[campaign.status] || <NotFoundView />;

  return (
    <Grid container position="relative" sx={{ mb: 2 }}>
      {CampaignComponent}
    </Grid>
  );
}

function Loading() {
  return <></>;
}

export default CampaignView;
