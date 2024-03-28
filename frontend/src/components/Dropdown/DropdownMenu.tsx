import { forwardRef } from 'react';
import classNames from 'classnames';

import { DropdownOption } from './Dropdown';
import styles from './dropdown.module.scss';

export interface DropdownMenuProps {
  active: boolean;
  className?: string;
  classes?: Record<'option', string>;
  options: DropdownOption[];
  position: 'bottom right';
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

    return (
      <ul className={rootClasses} ref={ref}>
        {props.options.map((option) => (
          <li className={classNames(styles.option)} key={option.value}>
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
