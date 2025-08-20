import { fr } from '@codegouvfr/react-dsfr';
import Grid from '@mui/material/Grid';
import classNames from 'classnames';
import { ReactElement } from 'react';
import { pluralize } from '../../utils/stringUtils';
import SelectableListHeaderActions from './SelectableListHeaderActions';
import { findChild } from '../../utils/elementUtils';
import styles from './selectable-list-header.module.scss';

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

  const buttonClasses = classNames('fr-link fr-link--md', styles.unselect);

  const selectedCount = hasSelected() && (
    <>
      <span className={styles.selection} role="status">
        {selected} {pluralizeMany(props.entity)} {pluralizeMany('sélectionné')}
      </span>
      <button className={buttonClasses} onClick={props.onUnselectAll}>
        Décocher la sélection
      </button>
    </>
  );

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
        margin: '1rem 0'
      }}
      size={12}
    >
      <Grid size="auto">{selectedCount}</Grid>
      <Grid
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}
        size="grow"
      >
        <SelectableListHeaderActions {...actions?.props} />
      </Grid>
    </Grid>
  );
}

export default SelectableListHeader;
