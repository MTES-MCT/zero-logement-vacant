import classNames from 'classnames';
import React from 'react';

import { displayCount } from '../../utils/stringUtils';
import styles from './campaign.module.scss';

interface CampaignCountsProps {
  housing?: number;
  owners?: number;
  className?: string;
  display?: 'row' | 'column';
}

const CampaignCounts = (props: CampaignCountsProps) => {
  const display = props.display ?? 'column';
  const classes = classNames(
    styles.count,
    {
      [styles.inline]: display === 'row',
    },
    props.className
  );

  return (
    <section className={classes}>
      <span
        className={classNames('fr-icon--sm fr-icon-home-4-fill', {
          'fr-mr-1w': display === 'row',
        })}
        aria-hidden
      >
         {props.housing ? displayCount(props.housing ?? 0, 'logement') : '...'}
      </span>
      <span className="fr-icon--sm fr-icon-user-fill">
         
        {props.owners ? displayCount(props.owners ?? 0, 'propriétaire') : '...'}
      </span>
    </section>
  );
};

export default CampaignCounts;
