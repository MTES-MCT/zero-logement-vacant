import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Popover, { type PopoverProps } from '@mui/material/Popover';
import { useId, useState, type ReactNode } from 'react';
import type { MarkOptional } from 'ts-essentials';

type DropdownProps = {
  children: ReactNode;
  label: string;
  buttonProps?: MarkOptional<
    Exclude<ButtonProps, ButtonProps.AsAnchor>,
    'children'
  >;
  popoverProps?: Omit<PopoverProps, 'id' | 'anchorEl' | 'open' | 'onClose'>;
};

function Dropdown(props: DropdownProps) {
  const { buttonProps, label, popoverProps } = props;
  const buttonId = useId();
  const popoverId = useId();

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const isOpen = !!anchor;

  function onClick(event: React.MouseEvent<HTMLButtonElement>): void {
    setAnchor(event.currentTarget);
  }

  function onClose(): void {
    setAnchor(null);
  }

  return (
    <>
      <Button
        {...buttonProps}
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
