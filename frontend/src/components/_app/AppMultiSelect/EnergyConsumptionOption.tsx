import DPE from '../../DPE/DPE';
import AppMultiSelectOption, {
  type AppMultiSelectOptionProps
} from './AppMultiSelectOption';

interface Props extends AppMultiSelectOptionProps<string> {
  label: string;
}

function EnergyConsumptionOption(props: Props) {
  return (
    <AppMultiSelectOption {...props} label={<DPE value={props.label} />} />
  );
}

export default EnergyConsumptionOption;
