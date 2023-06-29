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
import { capitalize, mailto } from '../../utils/stringUtils';

interface OwnerDetailsCardProps {
  owner: Owner;
}

function OwnerDetailsCard({ owner }: OwnerDetailsCardProps) {
  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className="fr-mb-1w fr-px-1w"
      isGrey
    >
      <CardTitle>
        <Title as="h2" look="h6" spacing="mb-1w" className={styles.titleInline}>
          Coordonnées
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
            <Link className="mailto" isSimple href={mailto(owner.email)}>
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
