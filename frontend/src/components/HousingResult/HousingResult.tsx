import { Container, Text } from '../_dsfr';
import styles from './housing-result.module.scss';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Badge from '@codegouvfr/react-dsfr/Badge';
import { OccupancyKind, OccupancyKindBadgeLabels } from '../../models/Housing';

interface Props {
  address: string;
  appartment?: number;
  display?: 'one-line' | 'two-lines';
  floor?: number;
  localId: string;
  occupancy: OccupancyKind;
}

function HousingResult(props: Props) {
  const display = props.display ?? 'one-line';
  const floor = props.floor ? `- Étage ${props.floor}` : null;
  const appartment = props.appartment
    ? `- Appartement ${props.appartment}`
    : null;
  const occupancy = (
    <>
      <Text as="span" spacing="mb-0">
        Statut d’occupation : 
      </Text>
      <Badge>{OccupancyKindBadgeLabels[props.occupancy]}</Badge>
    </>
  );

  return (
    <Container as="article" className={styles.container}>
      <Text bold size="lg" spacing="mb-1w">
        {props.address}
      </Text>
      {display === 'two-lines' && (
        <Container fluid>
          <Text as="span" spacing="mr-1w mb-1w">
            Identifiant du local :
          </Text>
          <Tag>{props.localId}</Tag>
          <Text as="span" spacing="mb-0">
            {appartment} {floor} - {occupancy} 
          </Text>
        </Container>
      )}
    </Container>
  );
}

export default HousingResult;
