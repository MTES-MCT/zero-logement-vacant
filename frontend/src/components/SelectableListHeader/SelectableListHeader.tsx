import React, { ReactElement } from 'react';
import { Col, Row } from '@dataesr/react-dsfr';
import { pluralize } from '../../utils/stringUtils';
import SelectableListHeaderActions from './SelectableListHeaderActions';
import { findChild } from '../../utils/elementUtils';
import classNames from 'classnames';
import styles from './selectable-list-header.module.scss';

export type SelectableEntity = 'logement' | 'périmètre';

interface SelectableListHeaderProps {
  children?: ReactElement | ReactElement[];
  selected?: number;
  count?: number;
  total?: number;
  onUnselectAll?: () => void;
  entity: SelectableEntity;
  default?: ReactElement;
}

function SelectableListHeader(props: SelectableListHeaderProps) {
  const actions = findChild(props.children, SelectableListHeaderActions);

  const { selected } = {
    selected: 0,
    ...props,
  };

  const pluralizeMany = pluralize(selected);

  const hasSelected = (): boolean => selected > 0;

  const buttonClasses = classNames('fr-link fr-link--md', styles.unselect);

  const selectedCount = hasSelected() && (
    <>
      <span className={styles.selection}>
        {selected} {pluralizeMany(props.entity)} {pluralizeMany('sélectionné')}
      </span>
      <button className={buttonClasses} onClick={props.onUnselectAll}>
        Décocher la sélection
      </button>
    </>
  );

  const classes = classNames(styles.selectableListHeader, {
    [styles.selectableListHeaderInfo]: selected > 0,
  });

  return (
    <>
      {!hasSelected() && props.default ? (
        props.default
      ) : (
        <Row alignItems="middle" className={classes}>
          <Col>{selectedCount}</Col>
          <Col n={hasSelected() ? '6' : '8'}>
            <SelectableListHeaderActions {...actions?.props} />
          </Col>
        </Row>
      )}
    </>
  );
}

export default SelectableListHeader;
