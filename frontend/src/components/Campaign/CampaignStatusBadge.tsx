import type { BadgeProps } from '@codegouvfr/react-dsfr/Badge';

import AppBadge from '../_app/AppBadge/AppBadge';
import {
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus
} from '@zerologementvacant/models';
import type { ColorFamily } from '~/models/ColorFamily';

interface Props {
  status: CampaignStatus;
  badgeProps?: Omit<BadgeProps, 'children'>;
}

function CampaignStatusBadge(props: Readonly<Props>) {
  const colors: Record<CampaignStatus, ColorFamily> = {
    draft: 'yellow-tournesol',
    sending: 'green-menthe',
    'in-progress': 'green-bourgeon',
    archived: 'blue-cumulus'
  };
  const texts: Record<CampaignStatus, string> = CAMPAIGN_STATUS_LABELS;

  const color = colors[props.status];
  const text = texts[props.status];

  return (
    <AppBadge {...props.badgeProps} colorFamily={color}>
      {text}
    </AppBadge>
  );
}

export default CampaignStatusBadge;
