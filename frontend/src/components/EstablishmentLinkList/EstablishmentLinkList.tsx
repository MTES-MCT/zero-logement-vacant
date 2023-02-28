import React from 'react';
import { Button, Title } from '@dataesr/react-dsfr';
import { useEstablishments } from '../../hooks/useEstablishments';
import { Establishment } from '../../models/Establishment';
import styles from './establisment-link-list.module.scss';
import { normalizeUrlSegment } from '../../utils/fetchUtils';
import { useHistory } from 'react-router-dom';

interface Props {
  establishments: Establishment[];
  title?: string;
}

const EstablishmentLinkList = ({ establishments, title }: Props) => {
  const { establishmentWithKinds } = useEstablishments(establishments);

  const history = useHistory();

  return (
    <section className="fr-mt-6w">
      {title && (
        <Title as="h2" look="h4" spacing="mb-0">
          {title} :
        </Title>
      )}
      <div>
        {establishmentWithKinds(['Commune'])?.map((establishment) => (
          <Button
            onClick={() =>
              history.push(
                `communes/${normalizeUrlSegment(establishment.shortName)}-${
                  establishment.geoCodes[0]
                }`
              )
            }
            className={styles.establishmentButton}
            key={establishment.id}
          >
            {establishment.shortName}
          </Button>
        ))}
      </div>
      <div>
        {establishmentWithKinds([
          'EPCI',
          'DDT',
          'DDTM',
          'DREAL',
          'DRIHL',
          'DRIEAT',
        ])?.map((establishment) => (
          <Button
            onClick={() =>
              history.push(
                `collectivites/${normalizeUrlSegment(establishment.shortName)}`
              )
            }
            className={styles.establishmentButton}
            key={establishment.id}
          >
            {establishment.shortName}
          </Button>
        ))}
      </div>
    </section>
  );
};

export default EstablishmentLinkList;
