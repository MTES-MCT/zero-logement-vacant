import {
  Button,
  Checkbox,
  Col,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
} from '@dataesr/react-dsfr';
import React from 'react';
import { vacancyReasonsOptions } from '../../../models/HousingFilters';
import styles from './vacancy-reason-modal.module.scss';

interface Props {
  onClose: () => void;
}

const VacancyReasonsModal = ({ onClose }: Props) => {
  const submit = (): void => {};

  return (
    <div>
      <Modal
        isOpen
        hide={onClose}
        size="lg"
        className={styles.vacancyReasonModal}
      >
        <ModalClose hide={onClose} title="Fermer la fenêtre">
          Fermer
        </ModalClose>
        <ModalTitle>
          <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
          Définissez une ou plusieurs causes de vacance
        </ModalTitle>
        <ModalContent>
          <Container as="section" fluid>
            <Row gutters>
              <Col n="6">
                {vacancyReasonsOptions
                  .slice(
                    0,
                    vacancyReasonsOptions.findIndex(
                      (_) => _.label === 'Vacance volontaire'
                    )
                  )
                  .map(
                    (option, index) =>
                      option.markup?.({}) ?? (
                        <Checkbox
                          label={option.label}
                          key={`vacancy_reason_${index}`}
                        />
                      )
                  )}
              </Col>
              <Col n="6">
                {vacancyReasonsOptions
                  .slice(
                    vacancyReasonsOptions.findIndex(
                      (_) => _.label === 'Vacance volontaire'
                    )
                  )
                  .map(
                    (option, index) =>
                      option.markup?.({}) ?? (
                        <Checkbox
                          label={option.label}
                          key={`vacancy_reason_${index}`}
                        />
                      )
                  )}
              </Col>
            </Row>
          </Container>
        </ModalContent>
        <ModalFooter>
          <Button secondary className="fr-mr-2w" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => submit()}>Enregistrer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default VacancyReasonsModal;
