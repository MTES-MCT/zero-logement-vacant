import AppBadge from '../_app/AppBadge/AppBadge';
import {
  CAMPAIGN_STATUS_LABELS,
  CampaignStatus
} from '@zerologementvacant/models';

interface Props {
  status: CampaignStatus;
}

function CampaignStatusBadge(props: Readonly<Props>) {
  const colors: Record<CampaignStatus, string> = {
    draft: 'yellow-tournesol',
    sending: 'green-menthe',
    'in-progress': 'green-bourgeon',
    archived: 'blue-cumulus'
  };
  const texts: Record<CampaignStatus, string> = CAMPAIGN_STATUS_LABELS;

  const color = colors[props.status];
  const text = texts[props.status];

  return <AppBadge colorFamily={color}>{text}</AppBadge>;
}

export default CampaignStatusBadge;
