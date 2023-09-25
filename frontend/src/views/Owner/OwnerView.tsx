import React, { useState } from 'react';
import { Col, Row, Tag, Title } from '@dataesr/react-dsfr';
import styles from './owner.module.scss';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import MainContainer from '../../components/MainContainer/MainContainer';

const OwnerView = () => {
  useDocumentTitle('Fiche propriétaire');

  const [isModalOwnerEditionOpen, setIsModalOwnerEditionOpen] = useState(false);

  const { count, owner, paginatedHousing } = useOwner();
  const housingCount = count?.housing ?? 0;

  if (!owner || !paginatedHousing) {
    return <></>;
  }

  return (
    <MainContainer isGrey>
      <Row alignItems="top" gutters>
        <Col n="4">
          <OwnerCard
            owner={owner}
            housingCount={housingCount}
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
                {housingCount}
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
    </MainContainer>
  );
};

export default OwnerView;
