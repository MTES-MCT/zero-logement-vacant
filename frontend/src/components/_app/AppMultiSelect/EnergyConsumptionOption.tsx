import AppMultiSelectOption, { AppMultiSelectOptionProps } from './AppMultiSelectOption';
import DPE from '../../DPE/DPE';

interface Props extends AppMultiSelectOptionProps {
  label: string;
}

function EnergyConsumptionOption(props: Props) {
  return (
    <AppMultiSelectOption {...props} label={<DPE value={props.label} />} />
  );
}

export default EnergyConsumptionOption;
