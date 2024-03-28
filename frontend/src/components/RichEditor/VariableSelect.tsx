import Dropdown, { DropdownOption, DropdownProps } from '../Dropdown/Dropdown';
import styles from './variable-select.module.scss';

interface Props {
  options: DropdownOption[];
  onSelect?: DropdownProps['onClick'];
}

function VariableSelect(props: Props) {
  const classes: DropdownProps['classes'] = {
    option: styles.option,
  };

  return (
    <Dropdown
      children="Champs personnalisés"
      classes={classes}
      iconPosition="right"
      position="bottom right"
      priority="secondary"
      options={props.options}
      onClick={props.onSelect}
    />
  );
}

export default VariableSelect;
