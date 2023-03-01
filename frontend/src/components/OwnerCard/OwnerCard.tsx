import {
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React, { ReactElement } from 'react';

import { Owner } from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';

interface OwnerCardProps {
  owner: Owner;
  children?: ReactElement | ReactElement[];
}

function OwnerCard({ owner, children }: OwnerCardProps) {
  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className="fr-mb-1w fr-px-1w"
    >
      <CardTitle>
        <span className="card-title-icon">
          <Icon name="ri-user-fill" iconPosition="center" size="1x" />
        </span>
        <Title as="h1" look="h4" spacing="mb-0" data-testid="fullName">
          {owner.fullName}
        </Title>
      </CardTitle>
      <CardDescription>
        {owner.birthDate && (
          <Text size="lg" className="fr-mb-0">
            né(e) le {birthdate(owner.birthDate)}{' '}
            <b>({age(owner.birthDate)} ans)</b>
          </Text>
        )}
        {children}
      </CardDescription>
    </Card>
  );
}

export default OwnerCard;
