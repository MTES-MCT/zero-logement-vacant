import AppBadge from '../_app/AppBadge/AppBadge';
import { CampaignSteps } from '../../models/Campaign';

interface Props {
  step: CampaignSteps;
}

const CampaignStatusBadge = ({ step }: Props) => {
  return (
    <AppBadge
      colorFamily={
        step < CampaignSteps.InProgress
          ? 'yellow-tournesol'
          : step < CampaignSteps.Archived
          ? 'green-bourgeon'
          : 'blue-cumulus'
      }
    >
      {step < CampaignSteps.InProgress
        ? 'Envoi en attente'
        : step < CampaignSteps.Archived
        ? 'Envoyée'
        : 'Archivée'}
    </AppBadge>
  );
};

export default CampaignStatusBadge;
