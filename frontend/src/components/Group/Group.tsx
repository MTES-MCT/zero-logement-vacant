import { Group as GroupModel } from '../../models/Group';
import { Col, Container, Row, Text } from '../_dsfr';
import styles from './group.module.scss';
import { pluralize } from '../../utils/stringUtils';
import { dateShortFormat } from '../../utils/dateUtils';
import GroupEditionModal from '../modals/GroupUpdateModal/GroupEditionModal';
import { GroupPayload } from '../../models/GroupPayload';
import { Campaign } from '../../models/Campaign';
import GroupRemovalModal from '../modals/GroupRemovalModal/GroupRemovalModal';
import AppLink from '../_app/AppLink/AppLink';
import { Button } from '@codegouvfr/react-dsfr/Button';
import GroupCampaignCreationModal from '../modals/GroupCampaignCreationModal/GroupCampaignCreationModal';
import { fr } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';

interface GroupProps {
  campaigns?: Campaign[];
  className?: string;
  group: GroupModel;
  onCampaignCreate?: (campaign: Pick<Campaign, 'title'>) => void;
  onExport?: () => void;
  onUpdate?: (group: GroupPayload) => void;
  onRemove?: () => void;
}

function Group(props: GroupProps) {
  const housing = pluralize(props.group.housingCount)('logement');
  const owners = pluralize(props.group.ownerCount)('propriétaire');

  function createCampaign(campaign: Pick<Campaign, 'title'>): void {
    props.onCampaignCreate?.(campaign);
  }

  function removeGroup(): void {
    props.onRemove?.();
  }

  function updateGroup(group: GroupPayload): void {
    props.onUpdate?.(group);
  }

  return (
    <Container as="article" className={props.className} fluid>
      <Row className="justify-space-between">
        <Col n="9" spacing="pr-2w">
          <Container as="header" fluid spacing="mb-1w">
            <Row alignItems="bottom" spacing="mb-1w">
              <Typography variant="h2" mr={1} mb={0}>
                {props.group.title}
              </Typography>
              <GroupEditionModal
                title="Modifier les informations du groupe"
                openingButtonProps={{
                  children: 'Modifier',
                  priority: 'tertiary no outline',
                  iconId: 'ri-edit-line',
                  iconPosition: 'right',
                  size: 'small',
                }}
                group={props.group}
                onSubmit={updateGroup}
              />
            </Row>
            <Row className="weight-500">
              <Text as="span" spacing="mr-2w mb-0" size="sm">
                <i
                  className={fr.cx('ri-home-2-fill', 'fr-icon--sm', 'fr-mr-1v')}
                />
                {props.group.housingCount} {housing}
              </Text>
              <Text as="span" spacing="mr-2w mb-0" size="sm">
                <i
                  className={fr.cx('ri-user-fill', 'fr-icon--sm', 'fr-mr-1v')}
                />
                {props.group.ownerCount} {owners}
              </Text>
              <Text as="span" spacing="mb-0" size="sm">
                <i
                  className={fr.cx(
                    'ri-edit-box-fill',
                    'fr-icon--sm',
                    'fr-mr-1v'
                  )}
                />
                Créé le {dateShortFormat(props.group.createdAt)} par 
                {props.group.createdBy?.firstName} 
                {props.group.createdBy?.lastName}
              </Text>
            </Row>
          </Container>

          <Container as="main" fluid>
            <Row>
              <Col n="12">
                <Typography component="h6" mb={1}>
                  Description
                </Typography>
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
                    <AppLink
                      iconId="ri-mail-fill"
                      iconPosition="left"
                      isSimple
                      key={campaign.id}
                      to={`/campagnes/${campaign.id}`}
                    >
                      {campaign.title}
                    </AppLink>
                  </Col>
                ))}
              </Row>
            )}
          </Container>
        </Col>
        <Col n="3">
          <Container as="aside" className={styles.actions} fluid>
            <GroupCampaignCreationModal
              group={props.group}
              housingCount={props.group.housingCount}
              openingButtonProps={{
                className: styles.action,
              }}
              onSubmit={createCampaign}
            />
            <Button
              className={styles.action}
              priority="secondary"
              iconId="ri-upload-2-line"
              onClick={props.onExport}
            >
              Exporter
            </Button>
            <GroupRemovalModal
              campaigns={props.campaigns}
              openingButtonProps={{
                className: styles.action,
              }}
              onSubmit={removeGroup}
            />
          </Container>
        </Col>
      </Row>
    </Container>
  );
}

export default Group;
