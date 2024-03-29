import Dropdown, { DropdownOption, DropdownProps } from '../Dropdown/Dropdown';
import { fr } from '@codegouvfr/react-dsfr';

interface Props {
  options: DropdownOption[];
  onSelect?: DropdownProps['onClick'];
}

function VariableSelect(props: Readonly<Props>) {
  const classes: DropdownProps['classes'] = {
    option: fr.cx(
      'fr-badge',
      'fr-badge--sm',
      'fr-badge--no-icon',
      'fr-badge--success'
    ),
  };

  return (
    <Dropdown
      children="Champs personnalisés"
      classes={classes}
      iconPosition="right"
      priority="secondary"
      options={props.options}
      onClick={props.onSelect}
    />
  );
}

export default VariableSelect;
