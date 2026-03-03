import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { pluralize } from '../../utils/stringUtils';
import SelectableListHeaderActions from './SelectableListHeaderActions';
import { findChild } from '../../utils/elementUtils';

export type SelectableEntity = 'logement' | 'périmètre';

interface SelectableListHeaderProps {
  /**
   * @deprecated
   */
  children?: ReactElement | ReactElement[];
  selected?: number;
  count?: number;
  onUnselectAll?: () => void;
  entity: SelectableEntity;
  default?: ReactElement;
}

function SelectableListHeader(props: SelectableListHeaderProps) {
  const actions = findChild(props.children, SelectableListHeaderActions);

  const { selected } = {
    selected: 0,
    ...props
  };

  const pluralizeMany = pluralize(selected);

  const hasSelected = (): boolean => selected > 0;

  if (!hasSelected() && props.default) {
    return props.default;
  }

  return (
    <Grid
      container
      sx={{
        alignItems: 'center',
        backgroundColor:
          selected > 0
            ? fr.colors.decisions.background.actionLow.blueCumulus.default
            : undefined,
        padding: '0.5rem 0.5rem 0.5rem 1rem',
        margin: '1rem 0',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}
      size={12}
    >
      <Grid size="auto">
        <Typography component="span" role="status" sx={{ fontWeight: 500 }}>
          {selected} {pluralizeMany(props.entity)}{' '}
          {pluralizeMany('sélectionné')}
        </Typography>
      </Grid>
      <Grid size="auto">
        <Button
          priority="tertiary no outline"
          size="small"
          onClick={props.onUnselectAll}
        >
          Décocher la sélection
        </Button>
      </Grid>
      <Grid size="auto">
        <SelectableListHeaderActions {...actions?.props} />
      </Grid>
    </Grid>
  );
}

export default SelectableListHeader;
