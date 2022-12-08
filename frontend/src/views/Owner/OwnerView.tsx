import React, { useState } from 'react';
import { Button, Col, Container, Row, Tag, Title } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import styles from './owner.module.scss';
import { update } from '../../store/actions/ownerAction';
import { Owner } from '../../models/Owner';
import OwnerEditionModal
    from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useOwner } from "../../hooks/useOwner";
import OwnerCard from "../../components/OwnerCard/OwnerCard";
import OwnerDetailsCard
    from "../../components/OwnerDetailsCard/OwnerDetailsCard";
import OwnerHousingCard
    from "../../components/OwnerHousingCard/OwnerHousingCard";
import HousingNoteModal
    from "../../components/modals/HousingNoteModal/HousingNoteModal";
import { Housing } from "../../models/Housing";

const OwnerView = () => {
    const dispatch = useDispatch();
    const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);
    const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);

    const { owner, housingList } = useOwner()

    const updateOwner = (owner: Owner) => {
        dispatch(update(owner));
        setIsModalOwnerOpen(false);
    }

    function submitHousingNoteAboutOwner(): void {
        // TODO
        setIsModalNoteOpen(false)
    }

    function submitHousingNoteAboutHousing(housingList: Housing[]): void {
        // TODO
        setIsModalNoteOpen(false)
    }

    if (!owner || !housingList) {
        return <></>
    }

    return (
      <Container as="main" className="bg-100" fluid>
          <Container as="section">
              {isModalOwnerOpen &&
                <OwnerEditionModal
                  owner={owner}
                  onUpdate={updateOwner}
                  onClose={() => setIsModalOwnerOpen(false)}
                />
              }
              {isModalNoteOpen &&
                <HousingNoteModal
                  housingList={housingList}
                  onClose={() => setIsModalNoteOpen(false)}
                  onSubmitAboutOwner={submitHousingNoteAboutOwner}
                  onSubmitAboutHousing={submitHousingNoteAboutHousing}
                />
              }
              <Row>
                  <AppBreadcrumb />
              </Row>
              <Row alignItems="top" gutters spacing="mt-3w mb-0">
                  <Col n="4">
                      <OwnerCard owner={owner} />
                      <OwnerDetailsCard owner={owner} onModify={() => setIsModalOwnerOpen(true)} />
                  </Col>
                  <Col n="8">
                      <header className={styles.header}>
                          <Title as="h3" look="h6" spacing="mb-0">
                                  <span className="fr-mr-1w">
                                      Tous les logements
                                  </span>
                              <Tag as="span" className={styles.tag}>
                                  {housingList.length}
                              </Tag>
                          </Title>
                          <Button secondary icon="ri-sticky-note-fill" onClick={() => setIsModalNoteOpen(true)}>
                              Ajouter une note
                          </Button>
                      </header>
                      <Row gutters>
                          {housingList.map(housing => (
                            <Col n="6">
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

