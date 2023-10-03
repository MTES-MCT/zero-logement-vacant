import { Button, Col, Container, Row, Title } from '@dataesr/react-dsfr';

import Alert from '../Alert/Alert';
import GroupCard from '../GroupCard/GroupCard';
import { useFindGroupsQuery } from '../../services/group.service';
import styles from './group-header.module.scss';
import { useState } from 'react';

export const DISPLAY_GROUPS = 3;

function GroupHeader() {
  const [showAll, setShowAll] = useState(false);

  const { data: groups, isLoading: isLoadingGroups } = useFindGroupsQuery();

  const filteredGroups = showAll ? groups : groups?.slice(0, DISPLAY_GROUPS);
  const more = (groups?.length ?? 0) - (filteredGroups?.length ?? 0);

  function toggleShowAll(): void {
    setShowAll((prev) => !prev);
  }

  return (
    <>
      <Container as="article" className="d-flex" fluid spacing="mb-2w">
        <Title as="h6" className="d-inline-block" spacing="mb-0 mr-2w">
          Vos groupes de logements
        </Title>
        <Button secondary icon="ri-add-fill" iconPosition="left" size="sm">
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
      </Container>
    </>
  );
}

export default GroupHeader;
