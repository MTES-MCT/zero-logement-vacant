import { findStatus } from '../../models/HousingState';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';

export type HousingSubStatusSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<string, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'invalid'
  | 'multiple'
  | 'options'
  | 'value'
  | 'onChange'
>;

function HousingSubStatusSelect<Multiple extends boolean = false>(
  props: HousingSubStatusSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      groupBy={(subStatus) => findStatus(subStatus).toString()}
      renderGroup={(group) => <HousingStatusBadge status={Number(group)} />}
      label="Sous-statut de suivi"
    />
  );
}

export default HousingSubStatusSelect;
