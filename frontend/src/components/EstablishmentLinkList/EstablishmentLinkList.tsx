import React from 'react';
import { Link, Title } from '@dataesr/react-dsfr';
import { useEstablishments } from '../../hooks/useEstablishments';
import { Establishment } from '../../models/Establishment';
import { toKebabCase } from '../../utils/stringUtils';
import styles from './establisment-link-list.module.scss';

interface Props {
  establishments: Establishment[];
  title?: string;
}

const EstablishmentLinkList = ({ establishments, title }: Props) => {
  const { establishmentShortNamesByKinds } = useEstablishments(establishments);

  return (
    <section className="fr-mt-6w">
      {title && (
        <Title as="h2" look="h4" spacing="mb-0">
          {title} :
        </Title>
      )}
      <div>
        {establishmentShortNamesByKinds(['Commune'])?.map((shortName) => (
          <Link href={toKebabCase(shortName)} className={styles.linkButton}>
            {shortName}
          </Link>
        ))}
      </div>
      <div>
        {establishmentShortNamesByKinds([
          'EPCI',
          'DDT',
          'DDTM',
          'DREAL',
          'DRIHL',
          'DRIEAT',
        ])?.map((shortName) => (
          <Link href={toKebabCase(shortName)} className={styles.linkButton}>
            {shortName}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default EstablishmentLinkList;
