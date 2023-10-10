import { Group as GroupModel } from '../../models/Group';
import {
  Button,
  Col,
  Container,
  Icon,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import styles from './group.module.scss';
import { pluralize } from '../../utils/stringUtils';
import { dateShortFormat } from '../../utils/dateUtils';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { useState } from 'react';
import GroupUpdateModal from '../modals/GroupUpdateModal/GroupUpdateModal';
import { GroupPayload } from '../../models/GroupPayload';
import { Campaign } from '../../models/Campaign';
import InternalLink from '../InternalLink/InternalLink';

interface GroupProps {
  group: GroupModel;
  campaigns?: Campaign[];
  onCampaignCreate?: () => void;
  onExport?: () => void;
  onUpdate?: (group: GroupPayload) => void;
  onRemove?: () => void;
}

function Group(props: GroupProps) {
  const housing = pluralize(props.group.housingCount)('logement');
  const owners = pluralize(props.group.ownerCount)('propriétaire');

  function createCampaign(): void {
    props.onCampaignCreate?.();
  }

  const [confirmGroupRemoval, setConfirmGroupRemoval] = useState(false);
  function removeGroup(): void {
    props.onRemove?.();
    setConfirmGroupRemoval(false);
  }

  const [showGroupUpdateModal, setShowGroupUpdateModal] = useState(false);
  function updateGroup(group: GroupPayload): void {
    props.onUpdate?.(group);
    setShowGroupUpdateModal(false);
  }

  return (
    <Container as="article" fluid>
      <Row className="justify-space-between">
        <Col n="6" spacing="pr-2w">
          <Container as="header" fluid spacing="mb-1w">
            <Row alignItems="top">
              <Title as="h2" spacing="mr-1w mb-2w">
                {props.group.title}
              </Title>
              <Button
                hasBorder={false}
                icon="ri-edit-line"
                iconPosition="right"
                secondary
                size="lg"
                onClick={() => setShowGroupUpdateModal(true)}
              >
                Modifier
              </Button>
            </Row>
            <Row className="weight-500">
              <Icon
                name="ri-home-2-fill"
                iconPosition="left"
                size="sm"
                title="Logements"
              />
              <Text as="span" spacing="mr-2w mb-0" size="sm">
                {props.group.housingCount} {housing}
              </Text>
              <Icon
                name="ri-user-fill"
                iconPosition="left"
                size="sm"
                title="Propriétaires"
              />
              <Text as="span" spacing="mr-2w mb-0" size="sm">
                {props.group.ownerCount} {owners}
              </Text>
              <Icon
                name="ri-edit-box-fill"
                iconPosition="left"
                size="sm"
                title="Date de création"
              />
              <Text as="span" spacing="mb-0" size="sm">
                Créé le {dateShortFormat(props.group.createdAt)} par 
                {props.group.createdBy?.firstName} 
                {props.group.createdBy?.lastName}
              </Text>
            </Row>
          </Container>

          <Container as="main" fluid>
            <Row>
              <Col n="12">
                <Title as="h6" spacing="mb-1w">
                  Description
                </Title>
              </Col>
              <Col n="12">
                <Text>{props.group.description}</Text>
              </Col>
            </Row>
            {(props.campaigns?.length ?? 0) > 0 && (
              <Row spacing="mb-2w">
                <Col n="12">
                  <Text className="weight-500" spacing="mb-1w">
                    Campagnes basées sur ce groupe :
                  </Text>
                </Col>
                {props.campaigns?.map((campaign) => (
                  <Col n="12" key={campaign.id}>
                    <InternalLink
                      display="flex"
                      icon="ri-mail-fill"
                      iconPosition="left"
                      isSimple
                      key={campaign.id}
                      to={`/campagnes/C${campaign.campaignNumber}`}
                    >
                      {campaign.title}
                    </InternalLink>
                  </Col>
                ))}
              </Row>
            )}
          </Container>
        </Col>
        <Col n="3">
          <Container as="aside" className={styles.actions} fluid>
            <Button
              className={styles.action}
              disabled={props.group.housingCount === 0}
              onClick={createCampaign}
            >
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
              onClick={() => setConfirmGroupRemoval(true)}
            >
              Supprimer le groupe
            </Button>
          </Container>
        </Col>
      </Row>

      <GroupUpdateModal
        open={showGroupUpdateModal}
        title={props.group.title}
        description={props.group.description}
        onSubmit={updateGroup}
        onClose={() => setShowGroupUpdateModal(false)}
      />

      {confirmGroupRemoval && (
        <ConfirmationModal
          alignFooter="right"
          icon=""
          size="md"
          title="Suppression du groupe"
          onSubmit={removeGroup}
          onClose={() => setConfirmGroupRemoval(false)}
        >
          <Text>Êtes-vous sûr de vouloir supprimer ce groupe ?</Text>
        </ConfirmationModal>
      )}
    </Container>
  );
}

export default Group;
