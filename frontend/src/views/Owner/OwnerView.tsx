import React, { useState } from 'react';
import { Col, Container, Row, Tag, Title } from '@dataesr/react-dsfr';
import styles from './owner.module.scss';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';

const OwnerView = () => {
  useDocumentTitle('Fiche propriétaire');

  const [isModalOwnerEditionOpen, setIsModalOwnerEditionOpen] = useState(false);

  const { owner, paginatedHousing } = useOwner();

  if (!owner || !paginatedHousing) {
    return <></>;
  }

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <OwnerCard
              owner={owner}
              onModify={() => setIsModalOwnerEditionOpen(true)}
            />
            {isModalOwnerEditionOpen && (
              <OwnerEditionModal
                owner={owner}
                onClose={() => setIsModalOwnerEditionOpen(false)}
              />
            )}
          </Col>
          <Col n="8">
            <header className={styles.header}>
              <Title as="h3" look="h6" spacing="mb-0">
                <span className="fr-mr-1w">Tous les logements</span>
                <Tag as="span" className={styles.tag}>
                  {paginatedHousing.entities.length}
                </Tag>
              </Title>
            </header>
            <Row gutters>
              {paginatedHousing.entities.map((housing) => (
                <Col n="6" key={`col-${housing.id}`}>
                  <OwnerHousingCard housing={housing} />
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default OwnerView;
