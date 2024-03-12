import classNames from 'classnames';
import React from 'react';

import { useCountHousingQuery } from '../../services/housing.service';
import { displayCount } from '../../utils/stringUtils';
import styles from './campaign.module.scss';

interface CampaignCountsProps {
  campaignId: string;
  className?: string;
  display?: 'row' | 'column';
}

const CampaignCounts = (props: CampaignCountsProps) => {
  const { data: housingCount } = useCountHousingQuery({
    campaignIds: [props.campaignId],
  });

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
         
        {housingCount
          ? displayCount(housingCount?.housing ?? 0, 'logement')
          : '...'}
      </span>
      <span className="fr-icon--sm fr-icon-user-fill">
         
        {housingCount
          ? displayCount(housingCount?.owners ?? 0, 'propriétaire')
          : '...'}
      </span>
    </section>
  );
};

export default CampaignCounts;
