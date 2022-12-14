import {
  Card,
  CardDescription,
  CardTitle,
  Link,
  Text,
  Title,
} from '@dataesr/react-dsfr';

import { Owner } from '../../models/Owner';
import styles from './owner-details-card.module.scss';
import ButtonLink from '../ButtonLink/ButtonLink';
import { capitalize } from '../../utils/stringUtils';

interface OwnerDetailsCardProps {
  onModify?: () => any;
  owner: Owner;
}

function OwnerDetailsCard({ onModify, owner }: OwnerDetailsCardProps) {
  const mailto = (email: string): string => `mailto:${email}`;

  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className="fr-mb-1w fr-px-1w"
    >
      <CardTitle>
        <Title as="h2" look="h6" spacing="mb-1w" className={styles.titleInline}>
          Coordonnées
          <ButtonLink
            className={styles.link}
            display="flex"
            icon="ri-edit-2-fill"
            iconPosition="left"
            iconSize="1x"
            isSimple
            title="Modifier le propriétaire"
            onClick={() => onModify?.()}
          >
            Modifier
          </ButtonLink>
        </Title>
        <hr />
      </CardTitle>
      <CardDescription className={styles.content}>
        <div>
          <Text size="sm" className="zlv-label">
            Adresse postale
          </Text>
          {owner.rawAddress.map((address, i) => (
            <Text
              className="capitalize"
              key={`${owner.id}_address_${i}`}
              spacing="mb-0"
            >
              {capitalize(address)}
            </Text>
          ))}
        </div>
        {owner.email && (
          <div>
            <Text size="sm" className="zlv-label">
              Adresse mail
            </Text>
            <Link className={styles.mailto} isSimple href={mailto(owner.email)}>
              {owner.email}
            </Link>
          </div>
        )}
        {owner.phone && (
          <div>
            <Text size="sm" className="zlv-label">
              Téléphone
            </Text>
            <Text spacing="mb-0">{owner.phone}</Text>
          </div>
        )}
      </CardDescription>
    </Card>
  );
}

export default OwnerDetailsCard;
