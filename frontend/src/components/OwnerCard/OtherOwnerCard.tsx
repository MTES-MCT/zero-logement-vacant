import { Icon, Text } from '../_dsfr';

import {
  getHousingOwnerRankLabel,
  HousingOwner
} from '../../models/Owner';

import styles from './owner-card.module.scss';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';

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
        <Icon
          name="fr-icon-user-fill"
          iconPosition="center"
        />
      </span>
      <Text as="span" className="color-black-50">
        <b>{owner.fullName}</b>
      </Text>
    </>
  }
  desc={
    <>
      <Text size="sm" className="zlv-label" as="span">
        {getHousingOwnerRankLabel(owner.rank)}
      </Text>
      <Text
        as="span"
        spacing="mb-0 mr-1w"
        className="float-right fr-link"
      >
        Voir la fiche
        <Icon
          name="fr-icon-arrow-right-line"
          size="lg"
          verticalAlign="middle"
          iconPosition="center"
        />
      </Text>
    </>
  }
  classes={{ end: 'd-none' }}
  ></Card>;
}

export default OtherOwnerCard;

