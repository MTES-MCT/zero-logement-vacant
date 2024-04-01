import Button from '@codegouvfr/react-dsfr/Button';
import { Menu, MenuItem } from '@mui/material';
import React, { useState } from 'react';

import { Variable } from './Variable';
import Badge from '@codegouvfr/react-dsfr/Badge';

interface Props {
  options: Variable[];
  onSelect?(option: Variable): void;
}

function VariableSelect(props: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchor);

  function open(event: React.MouseEvent<HTMLElement>): void {
    setAnchor(event.currentTarget);
  }

  function close(): void {
    setAnchor(null);
  }

  return (
    <>
      <Button
        id="menu-button"
        aria-controls={isOpen ? 'menu' : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : undefined}
        iconId={
          isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'
        }
        iconPosition="right"
        priority="secondary"
        type="button"
        onClick={open}
      >
        Champs personnalisés
      </Button>
      <Menu
        id="menu"
        anchorEl={anchor}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={isOpen}
        onClose={close}
        MenuListProps={{
          'aria-labelledby': 'menu-button',
        }}
      >
        {props.options.map((option) => (
          <MenuItem
            disableRipple
            key={option.value}
            onClick={() => props.onSelect?.(option)}
          >
            <Badge noIcon severity="new" small>
              {option.label}
            </Badge>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default VariableSelect;
