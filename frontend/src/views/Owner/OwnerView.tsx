import React, { useState } from 'react';
import { Button, Col, Container, Row, Tag, Title } from '@dataesr/react-dsfr';
import styles from './owner.module.scss';
import { useOwner } from '../../hooks/useOwner';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerHousingCard from '../../components/OwnerHousingCard/OwnerHousingCard';
import HousingNoteModal from '../../components/modals/HousingNoteModal/HousingNoteModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCreateNoteMutation } from '../../services/note.service';
import { HousingNoteCreation, OwnerNoteCreation } from '../../models/Note';

const OwnerView = () => {
  useDocumentTitle('Fiche propriétaire');

  const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);

  const { owner, housingList, refetchOwnerEvents } = useOwner();

  const [createNote] = useCreateNoteMutation();

  async function submitHousingNote(
    note: OwnerNoteCreation | HousingNoteCreation
  ): Promise<void> {
    await createNote(note).finally(() => {
      refetchOwnerEvents();
      setIsModalNoteOpen(false);
    });
  }

  if (!owner || !housingList) {
    return <></>;
  }

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        {isModalNoteOpen && (
          <HousingNoteModal
            owner={owner}
            housingList={housingList}
            onClose={() => setIsModalNoteOpen(false)}
            onSubmitAboutOwner={submitHousingNote}
            onSubmitAboutHousing={submitHousingNote}
          />
        )}
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <OwnerCard owner={owner} />
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
