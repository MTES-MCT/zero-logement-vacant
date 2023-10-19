import { Col, Container, Row, Title } from '../_dsfr';
import React, { useState } from 'react';

import GroupCard from '../GroupCard/GroupCard';
import {
  useCreateGroupMutation,
  useFindGroupsQuery,
} from '../../services/group.service';
import styles from './group-header.module.scss';
import { GroupPayload } from '../../models/GroupPayload';
import { useHistory } from 'react-router-dom';
import GroupEditionModal from '../modals/GroupUpdateModal/GroupEditionModal';
import Button from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

export const DISPLAY_GROUPS = 3;

function GroupHeader() {
  const [showAll, setShowAll] = useState(false);

  const { data: groups, isLoading: isLoadingGroups } = useFindGroupsQuery();

  const unarchivedGroups = groups?.filter((group) => !group.archivedAt);
  const filteredGroups = unarchivedGroups?.slice(
    0,
    showAll ? unarchivedGroups.length : DISPLAY_GROUPS
  );
  const more = (unarchivedGroups?.length ?? 0) - (filteredGroups?.length ?? 0);

  function toggleShowAll(): void {
    setShowAll((prev) => !prev);
  }

  const [createGroup] = useCreateGroupMutation();
  const router = useHistory();

  async function doCreateGroup(group: GroupPayload): Promise<void> {
    try {
      const created = await createGroup({
        title: group.title,
        description: group.description,
      }).unwrap();
      router.push({
        pathname: `/groupes/${created.id}`,
        state: {
          alert: 'Votre nouveau groupe a bien été créé.',
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Container as="article" fluid>
      <Container as="header" className="d-flex" fluid spacing="mb-2w">
        <Title as="h6" className="d-inline-block" spacing="mb-0 mr-2w">
          Vos groupes de logements
        </Title>
        <GroupEditionModal
          title="Création d’un nouveau groupe de logements"
          onSubmit={doCreateGroup}
        />
      </Container>
      <Container as="main" fluid>
        <Row alignItems="middle">
          {filteredGroups?.length === 0 ? (
            <Alert
              severity="info"
              closable
              title="Découvrez les groupes de logement"
              description="Pour étudier votre parc, vous pouvez créer des groupes de logements en fonction des critères de votre choix. Cela vous permettra notamment d'exporter la liste des logements ciblés et de préparer vos campagnes."
            />
          ) : (
            <>
              <Col n={more > 0 ? '10' : '12'}>
                <Container as="section" fluid>
                  <Row alignItems="middle" className={styles.row}>
                    {filteredGroups?.map((group) => (
                      <Col n="4" key={group.id} className={styles.col}>
                        <GroupCard group={group} />
                      </Col>
                    ))}
                    {showAll && (
                      <Col spacing="ml-1w">
                        <Button priority="tertiary" onClick={toggleShowAll}>
                          Afficher moins
                        </Button>
                      </Col>
                    )}
                  </Row>
                </Container>
              </Col>
              {!isLoadingGroups && more > 0 && (
                <Col n="2">
                  <Row alignItems="middle">
                    <Col spacing="ml-1w">
                      <Button priority="tertiary" onClick={toggleShowAll}>
                        <>Afficher plus ({more})</>
                      </Button>
                    </Col>
                  </Row>
                </Col>
              )}
            </>
          )}
        </Row>
      </Container>
    </Container>
  );
}

export default GroupHeader;
