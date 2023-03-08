import React, { useState } from 'react';
import { Button, Col, Container, Row, Tag, Title } from '@dataesr/react-dsfr';
import styles from './owner.module.scss';
import { createOwnerNote, update } from '../../store/actions/ownerAction';
import { Owner } from '../../models/Owner';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerDetailsCard from '../../components/OwnerDetailsCard/OwnerDetailsCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import HousingNoteModal from '../../components/modals/HousingNoteModal/HousingNoteModal';
import { HousingNote, OwnerNote } from '../../models/Note';
import { createHousingNote } from '../../store/actions/housingAction';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useStore';

const OwnerView = () => {
  useDocumentTitle('Fiche propriétaire');
  const dispatch = useAppDispatch();

  const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);
  const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);

  const { owner, housingList } = useOwner();

  const updateOwner = (owner: Owner) => {
    dispatch(update(owner));
    setIsModalOwnerOpen(false);
  };

  function submitHousingNoteAboutOwner(note: OwnerNote): void {
    dispatch(createOwnerNote(note));
    setIsModalNoteOpen(false);
  }

  function submitHousingNoteAboutHousing(note: HousingNote): void {
    dispatch(createHousingNote(note));
    setIsModalNoteOpen(false);
  }

  if (!owner || !housingList) {
    return <></>;
  }

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        {isModalOwnerOpen && (
          <OwnerEditionModal
            owner={owner}
            onUpdate={updateOwner}
            onClose={() => setIsModalOwnerOpen(false)}
          />
        )}
        {isModalNoteOpen && (
          <HousingNoteModal
            owner={owner}
            housingList={housingList}
            onClose={() => setIsModalNoteOpen(false)}
            onSubmitAboutOwner={submitHousingNoteAboutOwner}
            onSubmitAboutHousing={submitHousingNoteAboutHousing}
          />
        )}
        <Row>
          <AppBreadcrumb />
        </Row>
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <OwnerCard owner={owner} />
            <OwnerDetailsCard
              owner={owner}
              onModify={() => setIsModalOwnerOpen(true)}
            />
          </Col>
          <Col n="8">
            <header className={styles.header}>
              <Title as="h3" look="h6" spacing="mb-0">
                <span className="fr-mr-1w">Tous les logements</span>
                <Tag as="span" className={styles.tag}>
                  {housingList.length}
                </Tag>
              </Title>
              <Button
                secondary
                icon="ri-sticky-note-fill"
                onClick={() => setIsModalNoteOpen(true)}
              >
                Ajouter une note
              </Button>
            </header>
            <Row gutters>
              {housingList.map((housing) => (
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
