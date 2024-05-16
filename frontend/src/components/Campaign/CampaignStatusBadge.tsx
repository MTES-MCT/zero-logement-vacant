import AppBadge from '../_app/AppBadge/AppBadge';
import { CampaignStatus } from '../../../../shared';

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
  const texts = {
    draft: 'Envoi en attente',
    sending: 'En cours d’envoi',
    'in-progress': 'Envoyée',
    archived: 'Archivée'
  };

  const color = colors[props.status];
  const text = texts[props.status];

  return <AppBadge colorFamily={color}>{text}</AppBadge>;
}

export default CampaignStatusBadge;
