import { forwardRef, KeyboardEvent } from 'react';
import classNames from 'classnames';

import { DropdownOption } from './Dropdown';
import styles from './dropdown.module.scss';

export interface DropdownMenuProps {
  active: boolean;
  className?: string;
  classes?: Record<'option', string>;
  options: DropdownOption[];
  onClick?(option: DropdownOption): void;
}

const DropdownMenu = forwardRef<HTMLUListElement, DropdownMenuProps>(
  (props, ref) => {
    const rootClasses = classNames(styles.menu, props.className, {
      [styles.menuActive]: props.active,
    });

    function onClick(option: DropdownOption): void {
      props.onClick?.(option);
    }

    function onKeyDown(
      event: KeyboardEvent<HTMLLIElement>,
      option: DropdownOption
    ) {
      if (event.key === 'Enter') {
        onClick(option);
      }
    }

    return (
      <ul aria-labelledby="menu" className={rootClasses} ref={ref}>
        {props.options.map((option, index) => (
          <li
            aria-selected="false"
            className={classNames(styles.option)}
            key={option.value}
            role="option"
            tabIndex={0}
            onKeyDown={(event) => onKeyDown(event, option)}
          >
            <span
              className={props.classes?.option}
              onClick={() => onClick(option)}
            >
              {option.label}
            </span>
          </li>
        ))}
      </ul>
    );
  }
);

export default DropdownMenu;
