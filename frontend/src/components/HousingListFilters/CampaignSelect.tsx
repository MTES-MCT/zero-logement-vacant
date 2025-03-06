import { CampaignStatus } from '@zerologementvacant/models';
import { Campaign } from '../../models/Campaign';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';
import CampaignStatusBadge from '../Campaign/CampaignStatusBadge';

type CampaignSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<Campaign | null, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'multiple'
  | 'options'
  | 'value'
  | 'onChange'
>;

const CAMPAIGN_LESS_OPTION = {
  id: 'null',
  title: 'Campagne : dans aucune campagne en cours',
  status: null
};

function CampaignSelect<Multiple extends boolean = false>(
  props: CampaignSelectProps<Multiple>
) {
  const options = [CAMPAIGN_LESS_OPTION, ...props.options];

  return (
    <AppSelectNext
      {...props}
      options={options}
      label="Campagne"
      getOptionKey={(option) =>
        option !== null ? option.id : CAMPAIGN_LESS_OPTION.id
      }
      getOptionLabel={(option) =>
        option !== null ? option.title : CAMPAIGN_LESS_OPTION.title
      }
      getOptionValue={(option) =>
        option !== null ? option.id : CAMPAIGN_LESS_OPTION.id
      }
      groupBy={(option) => (option !== null ? option.status : null)}
      renderGroup={(group: CampaignStatus) => (
        <CampaignStatusBadge status={group} />
      )}
    />
  );
}

export default CampaignSelect;
