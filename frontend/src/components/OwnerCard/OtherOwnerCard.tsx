import { getHousingOwnerRankLabel, type HousingOwner } from '../../models/Owner';

import styles from './owner-card.module.scss';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';
import { fr } from '@codegouvfr/react-dsfr';
import { Typography } from '@mui/material';
import Label from '../Label/Label';

interface OtherOwnerCardProps {
  owner: HousingOwner;
}

function OtherOwnerCard({ owner }: OtherOwnerCardProps) {
  return (
    <Card
      classes={{ title: styles.removeIcon }}
      enlargeLink
      key={'owner_' + owner.rank}
      linkProps={
        owner.rank !== -2
          ? {
              to: '/proprietaires/' + owner.id
            }
          : { to: '#' }
      }
      className={classNames('fr-mb-1w', styles.coOwnerCard, 'app-card-xs')}
      title={
        <>
          <span className="icon-xs">
            <span
              className={fr.cx('fr-icon-user-fill', 'fr-icon--xs')}
              aria-hidden={true}
            />
          </span>
          <Typography component="span" fontWeight="700" color="black">
            {owner.fullName}
          </Typography>
        </>
      }
      desc={
        <>
          <Label as="span" aria-label="Rang du propriétaire">
            {getHousingOwnerRankLabel(owner.rank)}
          </Label>
          {owner.rank !== -2 && (
            <Typography
              component="span"
              mb={0}
              mr={1}
              className="float-right fr-link"
            >
              Voir la fiche
              <span
                className={fr.cx('fr-icon-arrow-right-line')}
                aria-hidden={true}
              />
            </Typography>
          )}
        </>
      }
    />
  );
}

export default OtherOwnerCard;
