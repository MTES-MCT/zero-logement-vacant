import { Icon } from '../_dsfr';
import classNames from 'classnames';
import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import styles from './extended-toggle.module.scss';
import { ToggleSwitchProps } from '@codegouvfr/react-dsfr/ToggleSwitch';
import {
  FrIconClassName,
  RiIconClassName,
} from '@codegouvfr/react-dsfr/src/fr/generatedFromCss/classNames';

type Props = ToggleSwitchProps & {
  disabled?: boolean;
  iconId?: FrIconClassName | RiIconClassName;
  onChange?: (checked: boolean) => void;
  vertical?: boolean;
  toggleColor?: string;
};

function ExtendedToggle(props: Props) {
  function toggleChecked() {
    props.onChange?.(!props.checked);
  }

  const id = useRef(props.id || uuidv4());
  const classes = classNames(
    styles.toggle,
    {
      'fr-toggle--label-left': props.labelPosition,
      'ds-fr-toggle': props.toggleColor && !props.disabled,
      [styles.vertical]: props.vertical,
    },
    props.className
  );

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--toggle-color',
      props.toggleColor ?? 'var(--blue-france-113)'
    );
  }, [props.toggleColor]);

  const checkboxLabels = props.vertical
    ? null
    : {
        'data-fr-checked-label': 'Activé',
        'data-fr-unchecked-label': 'Désactivé',
      };

  const icon = props.iconId ?? 'fr-icon-check-fill';

  return (
    <div className={classes}>
      <div className={styles.inputContainer} onClick={toggleChecked}>
        <input
          checked={props.checked}
          onChange={toggleChecked}
          type="checkbox"
          className={classNames(styles.input)}
          id={id.current}
        />
        <Icon className={styles.icon} iconPosition="center" name={icon} />
      </div>
      <label className={styles.label} htmlFor={id.current} {...checkboxLabels}>
        {props.label}
      </label>
      {props.helperText && <p className="fr-hint-text">{props.helperText}</p>}
    </div>
  );
}

export default ExtendedToggle;
