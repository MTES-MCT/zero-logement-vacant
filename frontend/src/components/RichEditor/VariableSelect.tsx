import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import { Menu, MenuItem } from '@mui/material';
import React, { useState } from 'react';

import { Variable } from './Variable';

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

  const options = props.options.map((option, i) => (
    <MenuItem
      classes={{ root: 'fr-py-1w' }}
      divider={i < props.options.length - 1}
      key={option.value}
      onClick={() => props.onSelect?.(option)}
    >
      <Badge noIcon severity="success" small>
        {option.label}
      </Badge>
    </MenuItem>
  ));

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
        MenuListProps={{
          'aria-labelledby': 'menu-button',
        }}
        open={isOpen}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        onClose={close}
      >
        {options}
      </Menu>
    </>
  );
}

export default VariableSelect;
