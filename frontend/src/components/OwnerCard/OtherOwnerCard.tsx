import {
  getHousingOwnerRankLabel,
  HousingOwner
} from '../../models/Owner';

import styles from './owner-card.module.scss';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';
import { fr } from '@codegouvfr/react-dsfr';
import { Typography } from '@mui/material';

interface OtherOwnerCardProps {
  owner: HousingOwner;
}

function OtherOwnerCard({ owner }: OtherOwnerCardProps) {

  return <Card
  enlargeLink
  key={'owner_' + owner.rank}
  linkProps={{
    to: '/proprietaires/' + owner.id
  }}
  className={classNames(
    'fr-mb-1w',
    styles.coOwnerCard,
    'app-card-xs'
  )}
  title={
    <>
      <span className="icon-xs">
        <span className={fr.cx("fr-icon-user-fill")} aria-hidden={true} />
      </span>
      <Typography component="span" fontWeight="700" color="black">
        {owner.fullName}
      </Typography>
    </>
  }
  desc={
    <>
      <Typography component="span" fontSize={'0.875rem'} fontWeight={500} color={'var(--grey-425)'}>
        {getHousingOwnerRankLabel(owner.rank)}
      </Typography>
      <Typography component="p" mb={0} mr={1} className='float-right fr-link'>
        Voir la fiche
        <span className={fr.cx("fr-icon-arrow-right-line")} aria-hidden={true} />
      </Typography>
    </>
  }
  classes={{ end: 'd-none' }}
  ></Card>;
}

export default OtherOwnerCard;

