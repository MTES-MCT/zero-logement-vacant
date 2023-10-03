import { Group as GroupModel } from '../../models/Group';
import {
  Button,
  Col,
  Container,
  Icon,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import styles from './group.module.scss';
import { pluralize } from '../../utils/stringUtils';
import { dateShortFormat } from '../../utils/dateUtils';

interface GroupProps {
  group: GroupModel;
  onCreateCampaign?: (group: GroupModel) => void;
  onExport?: (group: GroupModel) => void;
  onRemove?: (group: GroupModel) => void;
}

function Group(props: GroupProps) {
  const housing = pluralize(props.group.housingCount)('logement');
  const owners = pluralize(props.group.ownerCount)('propriétaire');

  return (
    <Container as="article" fluid>
      <Row className="justify-space-between">
        <Col n="6" spacing="pr-2w">
          <Container as="header" fluid spacing="mb-2w">
            <Row>
              <Title as="h2">{props.group.title}</Title>
            </Row>
            <Row>
              <Icon
                name="ri-home-2-fill"
                iconPosition="center"
                size="sm"
                title="Logements"
              />
              <Text as="span" spacing="mr-1w mb-0" size="sm">
                {props.group.housingCount} {housing}
              </Text>
              <Icon
                name="ri-user-fill"
                iconPosition="center"
                size="sm"
                title="Propriétaires"
              />
              <Text as="span" spacing="mr-1w mb-0" size="sm">
                {props.group.ownerCount} {owners}
              </Text>
              <Icon
                name="ri-edit-box-fill"
                iconPosition="center"
                size="sm"
                title="Date de création"
              />
              <Text as="span" spacing="mb-0" size="sm">
                Créé le {dateShortFormat(props.group.createdAt)} par 
                {props.group.createdBy.firstName} 
                {props.group.createdBy.lastName}
              </Text>
            </Row>
          </Container>
          <Container as="main" fluid>
            <Row>
              <Col n="12">
                <Text spacing="mb-1w">Description</Text>
              </Col>
              <Col n="12">
                <TextInput textarea defaultValue={props.group.description} />
              </Col>
            </Row>
          </Container>
        </Col>
        <Col n="3">
          <Container as="aside" fluid>
            <Button className={styles.action} onClick={props.onCreateCampaign}>
              Créer une campagne
            </Button>
            <Button
              className={styles.action}
              secondary
              icon="ri-upload-2-line"
              onClick={props.onExport}
            >
              Exporter
            </Button>
            <Button
              className={styles.action}
              tertiary
              icon="ri-delete-bin-line"
              onClick={props.onRemove}
            >
              Supprimer le groupe
            </Button>
          </Container>
        </Col>
      </Row>
    </Container>
  );
}

export default Group;
