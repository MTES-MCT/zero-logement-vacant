import type { CampaignStatus } from '@zerologementvacant/models';
import { useCampaign } from '../../hooks/useCampaign';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import NotFoundView from '../NotFoundView';
import CampaignDraft from './CampaignDraft';
import CampaignInProgress from './CampaignInProgress';
import CampaignSending from './CampaignSending';

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

  return CampaignComponent;
}

function Loading() {
  return <></>;
}

export default CampaignView;
