import React from 'react';
import { Link, Title } from '@dataesr/react-dsfr';
import { Establishment, getEstablishmentUrl } from '../../models/Establishment';
import styles from './establisment-link-list.module.scss';

interface Props {
  establishments: Establishment[];
  title: string;
}

const EstablishmentLinkList = ({ establishments, title }: Props) => {
  return (
    <section className="fr-mt-6w">
      <Title as="h2" look="h4" spacing="mb-0">
        {title}
      </Title>
      <div>
        {establishments.map((establishment) => (
          <Link
            href={getEstablishmentUrl(establishment)}
            className={styles.establishmentLink}
            key={establishment.id}
          >
            {establishment.shortName}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default EstablishmentLinkList;
