import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Popover, { type PopoverProps } from '@mui/material/Popover';
import classNames from 'classnames';
import { useId, useState, type ReactNode } from 'react';
import type { MarkOptional } from 'ts-essentials';

import styles from '~/components/Dropdown/dropdown.module.scss';

type DropdownProps = {
  children: ReactNode;
  label: string;
  buttonProps?: MarkOptional<
    Exclude<ButtonProps, ButtonProps.AsAnchor>,
    'children'
  >;
  popoverProps?: Omit<PopoverProps, 'id' | 'anchorEl' | 'open' | 'onClose'>;
  /**
   * The state of the dropdown, in controlled mode.
   */
  open?: boolean;
  onOpen?(): void;
  onClose?(): void;
};

function Dropdown(props: DropdownProps) {
  const { buttonProps, label, popoverProps } = props;
  const buttonId = useId();
  const popoverId = useId();

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  function isControlled(open: boolean | undefined): open is boolean {
    return open !== undefined;
  }

  const isOpen = isControlled(props.open) ? props.open && !!anchor : !!anchor;

  function onClick(event: React.MouseEvent<HTMLButtonElement>): void {
    setAnchor(event.currentTarget);
    props.onOpen?.();
  }

  function onClose(): void {
    setAnchor(null);
    props.onClose?.();
  }

  return (
    <>
      <Button
        // Default styles
        priority="tertiary"
        size="small"
        className={classNames(
          {
            [styles.active]: isOpen
          },
          buttonProps?.className
        )}
        iconId={
          isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'
        }
        iconPosition="right"
        // Override props
        {...buttonProps}
        // Fixed props
        id={buttonId}
        aria-describedby={popoverId}
        onClick={onClick}
      >
        {label}
      </Button>

      <Popover
        {...popoverProps}
        id={popoverId}
        anchorEl={anchor}
        open={isOpen}
        onClose={onClose}
      >
        {props.children}
      </Popover>
    </>
  );
}

export default Dropdown;
