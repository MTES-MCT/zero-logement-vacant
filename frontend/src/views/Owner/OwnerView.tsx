import { useState } from 'react';
import { Col, Row } from '../../components/_dsfr';
import styles from './owner.module.scss';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import MainContainer from '../../components/MainContainer/MainContainer';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Typography from '@mui/material/Typography';

const OwnerView = () => {
  useDocumentTitle('Fiche propriétaire');

  const { count, owner, paginatedHousing, } = useOwner();
  const housingCount = count?.housing ?? 0;

  const [ownerEditionModalKey, setOwnerEditionModalKey] = useState(
    new Date().getTime()
  );

  if (!owner || !paginatedHousing) {
    return <></>;
  }

  return (
    <MainContainer grey>
      <Row alignItems="top" gutters>
        <Col n="4">
          <OwnerCard
            owner={owner}
            housingCount={housingCount}
            modify={
              <OwnerEditionModal
                owner={owner}
                key={ownerEditionModalKey}
                onCancel={() => setOwnerEditionModalKey(new Date().getTime())}
              />
            }
          />
        </Col>
        <Col n="8">
          <header className={styles.header}>
            <Typography component="h3" variant="h6" mb={0}>
              <span className="fr-mr-1w">Tous les logements</span>
              <Tag className={styles.tag}>{housingCount}</Tag>
            </Typography>
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
