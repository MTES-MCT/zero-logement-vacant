import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import React, { useState } from 'react';

import Alert from '../Alert/Alert';
import GroupCard from '../GroupCard/GroupCard';
import {
  useCreateGroupMutation,
  useFindGroupsQuery,
} from '../../services/group.service';
import styles from './group-header.module.scss';
import GroupCreationModal from '../modals/GroupCreationModal/GroupCreationModal';
import { GroupPayload } from '../../models/GroupPayload';
import { useHistory } from 'react-router-dom';

export const DISPLAY_GROUPS = 3;

function GroupHeader() {
  const [showAll, setShowAll] = useState(false);

  const { data: groups, isLoading: isLoadingGroups } = useFindGroupsQuery();

  const filteredGroups = showAll ? groups : groups?.slice(0, DISPLAY_GROUPS);
  const more = (groups?.length ?? 0) - (filteredGroups?.length ?? 0);

  function toggleShowAll(): void {
    setShowAll((prev) => !prev);
  }

  const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
  const [createGroup] = useCreateGroupMutation();
  const router = useHistory();

  async function doCreateGroup(group: GroupPayload): Promise<void> {
    try {
      const created = await createGroup({
        title: group.title,
        description: group.description,
      }).unwrap();
      setShowGroupCreationModal(false);
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
        <Button
          secondary
          icon="ri-add-fill"
          iconPosition="left"
          size="sm"
          onClick={() => setShowGroupCreationModal(true)}
        >
          Créer un nouveau groupe
        </Button>
      </Container>
      <Container as="main" fluid>
        <Row alignItems="middle">
          {filteredGroups?.length === 0 ? (
            <Alert
              type="info"
              closable
              title="Découvrez les groupes de logement"
              description="Un groupe de logement est un ensemble de logements que vous pouvez constituer à partir de vos propres critères. Créez un groupe, ajoutes-y des logements et créez une campagne quand vous le désirez. Consultez notre documentation pour en savoir plus."
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
                        <Button tertiary onClick={toggleShowAll}>
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
                      <Button tertiary onClick={toggleShowAll}>
                        <>Afficher plus ({more})</>
                      </Button>
                    </Col>
                  </Row>
                </Col>
              )}
            </>
          )}
        </Row>

        <GroupCreationModal
          open={showGroupCreationModal}
          onSubmit={doCreateGroup}
          onClose={() => setShowGroupCreationModal(false)}
        />
      </Container>
    </Container>
  );
}

export default GroupHeader;
