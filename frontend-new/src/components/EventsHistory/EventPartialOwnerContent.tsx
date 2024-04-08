import styles from './events-history.module.scss';
import React from 'react';
import { hasValues } from '../../models/Diff';
import { Owner } from '../../models/Owner';
import { birthdate } from '../../utils/dateUtils';
import { addressToString } from '../../models/Address';

interface Props {
  partialOwner: Partial<Owner>;
  ownerName: string;
  eventName: string;
}

const EventPartialOwnerContent = ({
  partialOwner,
  ownerName,
  eventName,
}: Props) => {
  return partialOwner && hasValues(partialOwner) ? (
    <div className={styles.eventContent}>
      {eventName.includes('identité') && (
        <>
          {partialOwner.fullName === undefined && ownerName}
          {partialOwner.fullName !== undefined && (
            <>
              <span className="color-grey-625">Nom prénom</span>
              {partialOwner.fullName}
            </>
          )}
          {partialOwner.birthDate !== undefined &&
            partialOwner.birthDate !== null && (
              <>
                <span className="color-grey-625">Date de naissance</span>
                {birthdate(partialOwner.birthDate)}
              </>
            )}
        </>
      )}
      {eventName.includes('coordonnées') && (
        <>
          {ownerName}
          {partialOwner.rawAddress !== undefined &&
            partialOwner.rawAddress !== null && (
              <>
                <span className="color-grey-625">Adresse postale</span>
                {partialOwner.rawAddress.join(' - ')}
              </>
            )}
          {partialOwner.banAddress !== undefined &&
            partialOwner.banAddress !== null && (
              <>
                <span className="color-grey-625">Adresse postale</span>
                {addressToString(partialOwner.banAddress)}
              </>
            )}
          {partialOwner.additionalAddress !== undefined &&
            partialOwner.additionalAddress !== null && (
              <>
                <span className="color-grey-625">Complément d'adresse</span>
                {partialOwner.additionalAddress}
              </>
            )}
          {partialOwner.email !== undefined && partialOwner.email !== null && (
            <>
              <span className="color-grey-625">Adresse mail</span>
              {partialOwner.email}
            </>
          )}
          {partialOwner.phone !== undefined && partialOwner.phone !== null && (
            <>
              <span className="color-grey-625">Téléphone</span>
              {partialOwner.phone}
            </>
          )}
        </>
      )}
    </div>
  ) : (
    <div className={styles.eventContent}>-</div>
  );
};

export default EventPartialOwnerContent;
