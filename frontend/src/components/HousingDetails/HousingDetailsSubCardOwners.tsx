import {
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
} from '@dataesr/react-dsfr';
import React, { useState } from 'react';
import styles from './housing-details-card.module.scss';
import { updateHousingOwners } from '../../store/actions/housingAction';
import { useDispatch } from 'react-redux';
import { HousingOwner } from '../../models/Owner';
import HousingOwnersModal from '../modals/HousingOwnersModal/HousingOwnersModal';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
}

function HousingDetailsSubCardOwners({ housingId, housingOwners }: Props) {
  const dispatch = useDispatch();

  const [isModalOwnersOpen, setIsModalOwnersOpen] = useState(false);

  const submitHousingOwnersUpdate = (housingOwnersUpdated: HousingOwner[]) => {
    dispatch(updateHousingOwners(housingId, housingOwnersUpdated));
    setIsModalOwnersOpen(false);
  };

  return (
    <>
      <HousingDetailsSubCard
        title={`Tous les propriétaires (${housingOwners.length})`}
        onModify={() => setIsModalOwnersOpen(true)}
      >
        {housingOwners.map((housingOwner) => (
          <Card
            key={'owner_' + housingOwner.rank}
            hasArrow={false}
            href={
              (window.location.pathname.indexOf('proprietaires') === -1
                ? window.location.pathname
                : '') +
              '/proprietaires/' +
              housingOwner.id
            }
            className="fr-mb-1w"
          >
            <CardTitle>
              <span className={styles.iconXs}>
                <Icon name="ri-user-fill" iconPosition="center" size="xs" />
              </span>
              <Text as="span">
                <b>{housingOwner.fullName}</b>
              </Text>
            </CardTitle>
            <CardDescription>
              <Text size="sm" className="zlv-label" as="span">
                {!housingOwner.rank
                  ? 'Ancien propriétaire'
                  : housingOwner.rank === 1
                  ? 'Propriétaire principal'
                  : `${housingOwner.rank}ème ayant droit`}
              </Text>
              <Text
                as="span"
                spacing="mb-0 mr-1w"
                className="float-right fr-link"
              >
                Voir la fiche
                <Icon
                  name="ri-arrow-right-line"
                  size="lg"
                  verticalAlign="middle"
                  iconPosition="center"
                />
              </Text>
            </CardDescription>
          </Card>
        ))}
      </HousingDetailsSubCard>
      {isModalOwnersOpen && (
        <HousingOwnersModal
          housingOwners={housingOwners}
          onSubmit={submitHousingOwnersUpdate}
          onClose={() => setIsModalOwnersOpen(false)}
        />
      )}
    </>
  );
}

export default HousingDetailsSubCardOwners;
