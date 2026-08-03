import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import Popper, { type PopperProps } from '@mui/material/Popper';
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
  popoverProps?: Omit<PopperProps, 'id' | 'anchorEl' | 'open'>;
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
    if (isOpen) {
      onClose();
      return;
    }

    setAnchor(event.currentTarget);
    props.onOpen?.();
  }

  function onClose(): void {
    setAnchor(null);
    props.onClose?.();
  }

  function closeAndRestoreFocus(): void {
    onClose();
    anchor?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeAndRestoreFocus();
    }
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
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={onClick}
        nativeButtonProps={{
          ...buttonProps?.nativeButtonProps,
          onKeyDown(event) {
            buttonProps?.nativeButtonProps?.onKeyDown?.(event);
            if (!event.defaultPrevented) {
              onKeyDown(event);
            }
          }
        }}
      >
        {label}
      </Button>

      <Popper
        placement="bottom-start"
        sx={{ zIndex: 'modal' }}
        {...popoverProps}
        id={popoverId}
        anchorEl={anchor}
        open={isOpen}
      >
        <ClickAwayListener onClickAway={onClose}>
          <Paper
            aria-labelledby={buttonId}
            elevation={8}
            role="region"
            onKeyDown={onKeyDown}
          >
            {props.children}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

export default Dropdown;
