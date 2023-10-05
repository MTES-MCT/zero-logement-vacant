import { Text, Title } from '../../components/dsfr/index';

import { Owner } from '../../models/Owner';
import styles from './owner-details-card.module.scss';
import { capitalize, mailto } from '../../utils/stringUtils';
import Card from '@codegouvfr/react-dsfr/Card';
import AppLink from '../AppLink/AppLink';

interface OwnerDetailsCardProps {
  owner: Owner;
}

function OwnerDetailsCard({ owner }: OwnerDetailsCardProps) {
  return (
    <Card
      border={false}
      size="small"
      className="fr-mb-1w fr-px-1w"
      grey
      titleAs="h2"
      title={
        <Title as="h2" look="h6" spacing="mb-1w" className={styles.titleInline}>
          Coordonnées
        </Title>
      }
      desc={
        <div className={styles.content}>
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
              <AppLink className="mailto" isSimple to={mailto(owner.email)}>
                {owner.email}
              </AppLink>
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
        </div>
      }
    ></Card>
  );
}

export default OwnerDetailsCard;
