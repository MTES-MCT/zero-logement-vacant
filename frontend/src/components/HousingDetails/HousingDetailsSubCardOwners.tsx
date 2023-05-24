import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
} from '@dataesr/react-dsfr';
import React, { useState } from 'react';
import styles from './housing-details-card.module.scss';
import {
  addHousingOwner,
  createAdditionalOwner,
  updateHousingOwners,
} from '../../store/actions/housingAction';
import {
  DraftOwner,
  getHousingOwnerRankLabel,
  HousingOwner,
  Owner,
} from '../../models/Owner';
import HousingOwnersModal from '../modals/HousingOwnersModal/HousingOwnersModal';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import HousingAdditionalOwnerModal from '../modals/HousingAdditionnalOwnerModal/HousingAdditionalOwnerModal';
import { useAppDispatch } from '../../hooks/useStore';
import { useFindEventsByHousingQuery } from '../../services/event.service';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
}

function HousingDetailsSubCardOwners({ housingId, housingOwners }: Props) {
  const dispatch = useAppDispatch();

  const [isModalOwnersOpen, setIsModalOwnersOpen] = useState(false);
  const [isModalAdditionalOwnerOpen, setIsModalAdditionalOwnerOpen] =
    useState(false);

  const { refetch: refetchHousingEvents } =
    useFindEventsByHousingQuery(housingId);

  const submitHousingOwnersUpdate = (housingOwnersUpdated: HousingOwner[]) => {
    dispatch(
      updateHousingOwners(housingId, housingOwnersUpdated, refetchHousingEvents)
    );
    setIsModalOwnersOpen(false);
  };

  const submitAddingHousingOwner = (owner: Owner, rank: number) => {
    dispatch(addHousingOwner(housingId, owner, rank, refetchHousingEvents));
    setIsModalAdditionalOwnerOpen(false);
  };

  const submitCreatingHousingOwner = (draftOwner: DraftOwner, rank: number) => {
    dispatch(
      createAdditionalOwner(
        housingId,
        draftOwner,
        Number(rank),
        refetchHousingEvents
      )
    );
    setIsModalAdditionalOwnerOpen(false);
  };

  return (
    <>
      <HousingDetailsSubCard
        title={`Tous les propriétaires (${housingOwners.length})`}
        onModify={() => setIsModalOwnersOpen(true)}
      >
        <>
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
                  {getHousingOwnerRankLabel(housingOwner)}
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
        </>
        <Button
          className={styles.addButton}
          secondary
          icon="ri-add-fill"
          title="Ajouter un propriétaire"
          onClick={() => setIsModalAdditionalOwnerOpen(true)}
        >
          Ajouter un propriétaire
        </Button>
      </HousingDetailsSubCard>
      {isModalOwnersOpen && (
        <HousingOwnersModal
          housingOwners={housingOwners}
          onSubmit={submitHousingOwnersUpdate}
          onClose={() => setIsModalOwnersOpen(false)}
        />
      )}
      {isModalAdditionalOwnerOpen && (
        <HousingAdditionalOwnerModal
          activeOwnersCount={housingOwners.filter((_) => _.rank).length}
          onAddOwner={submitAddingHousingOwner}
          onCreateOwner={submitCreatingHousingOwner}
          onClose={() => setIsModalAdditionalOwnerOpen(false)}
        />
      )}
    </>
  );
}

export default HousingDetailsSubCardOwners;
