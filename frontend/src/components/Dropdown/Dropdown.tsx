import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';

import { useToggle } from '../../hooks/useToggle';
import DropdownMenu, { DropdownMenuProps } from './DropdownMenu';
import styles from './dropdown.module.scss';
import { useRef } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export interface DropdownOption {
  label: string;
  value: string;
}

type ButtonPropsFiltered = ButtonProps.Common &
  Omit<ButtonProps.WithIcon, 'iconId'>;

type DropdownMenuPropsFiltered = Pick<
  DropdownMenuProps,
  'options' | 'position' | 'onClick'
>;

export type DropdownProps = ButtonPropsFiltered &
  DropdownMenuPropsFiltered & {
    children: string;
    classes?: DropdownMenuProps['classes'];
  };

function Dropdown(props: DropdownProps) {
  const ref = useRef<HTMLUListElement>(null);
  const { active, toggle } = useToggle(false);

  useOutsideClick(ref, () => {
    if (active) {
      toggle();
    }
  });

  function onClick(): void {
    toggle();
  }

  function select(option: DropdownOption): void {
    toggle();
    props.onClick?.(option);
  }

  return (
    <div className={styles.dropdown}>
      <Button
        {...props}
        iconId={
          active ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'
        }
        type="button"
        onClick={onClick}
      >
        {props.children}
      </Button>
      <DropdownMenu
        active={active}
        classes={props.classes}
        options={props.options}
        position={props.position}
        ref={ref}
        onClick={select}
      />
    </div>
  );
}

export default Dropdown;
