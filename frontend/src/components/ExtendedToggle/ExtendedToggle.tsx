import { Icon, Toggle } from '@dataesr/react-dsfr';
import classNames from 'classnames';
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import styles from './extended-toggle.module.scss';

interface Props extends ComponentPropsWithoutRef<typeof Toggle> {
  disabled?: boolean;
  icon?: string;
  onChange?: (checked: boolean) => void;
  vertical?: boolean;
}

function ExtendedToggle(props: Props) {
  function toggleChecked() {
    props.onChange?.(!props.checked);
  }

  const id = useRef(props.id || uuidv4());
  const classes = classNames(
    styles.toggle,
    {
      'fr-toggle--border-bottom': props.hasSeparator,
      'fr-toggle--label-left': props.hasLabelLeft,
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

  const icon = props.icon ?? 'ri-check-fill';

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
      {props.description && <p className="fr-hint-text">{props.description}</p>}
    </div>
  );
}

export default ExtendedToggle;
