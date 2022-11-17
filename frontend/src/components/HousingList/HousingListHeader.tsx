import React, { ReactElement } from "react";
import { Col, Row } from "@dataesr/react-dsfr";
import { displayCount, pluralize } from "../../utils/stringUtils";
import HousingListHeaderActions from "./HousingListHeaderActions";
import { findChild } from "../../utils/elementUtils";
import { defaults } from "lodash";
import classNames from "classnames";
import styles from "./housing-list-header.module.scss";

interface HousingListHeaderProps {
  children?: ReactElement | ReactElement[]
  selected?: number
  count?: number
  total?: number
  onUnselectAll?: () => void
}

function HousingListHeader(props: HousingListHeaderProps) {
  const actions = findChild(props.children, HousingListHeaderActions)
  console.log('Props from HousingListHeader', props)

  const { selected, total } = defaults(props, {
    selected: 0,
    count: 0,
    total: 0
  })

  const pluralizeMany = pluralize(selected)

  const hasSelected = (): boolean => selected > 0

  const buttonClasses = classNames('fr-link fr-link--md', styles.unselect)

  const count = hasSelected()
    ? (
      <>
        <span className={styles.selection}>{selected} {pluralizeMany('logement')} {pluralizeMany('sélectionné')}</span>
        <button className={buttonClasses} onClick={props.onUnselectAll}>
          Supprimer la sélection
        </button>
      </>
    )
    : displayCount(total, 'logement', true, props.count)

  const classes = classNames(styles.housingListHeader, {
    [styles.housingListHeaderInfo]: selected > 0
  })

  return (
    <Row alignItems="middle" className={classes}>
      <Col>
        {count}
      </Col>
      <Col n={hasSelected() ? "6" : "8"}>
        <HousingListHeaderActions {...actions?.props} />
      </Col>
    </Row>
  )
}

export default HousingListHeader
