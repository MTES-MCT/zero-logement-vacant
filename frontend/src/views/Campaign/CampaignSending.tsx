import { Campaign } from '../../models/Campaign';

interface Props {
  campaign: Campaign;
}

function CampaignSending(props: Props) {
  return <span>Sending</span>;
}

export default CampaignSending;
