import {
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React from 'react';

import { Owner } from '../../models/Owner';
import styles from './owner-card.module.scss';
import { differenceInYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OwnerCardProps {
  owner: Owner;
}

function OwnerCard({ owner }: OwnerCardProps) {
  function birthdate(date: Date): string {
    return format(date, 'dd/MM/yyyy', { locale: fr });
  }

  function age(date: Date): number {
    return differenceInYears(new Date(), date);
  }

  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className="fr-mb-1w fr-px-1w"
    >
      <CardTitle>
        <span className={styles.icon}>
          <Icon name="ri-user-fill" iconPosition="center" size="1x" />
        </span>
        <Title as="h1" look="h4" spacing="mb-0" data-testid="fullName">
          {owner.fullName}
        </Title>
      </CardTitle>
      {owner.birthDate && (
        <CardDescription>
          <Text size="lg" className="fr-mb-0">
            né(e) le {birthdate(owner.birthDate)}{' '}
            <b>({age(owner.birthDate)} ans)</b>
          </Text>
        </CardDescription>
      )}
    </Card>
  );
}

export default OwnerCard;
