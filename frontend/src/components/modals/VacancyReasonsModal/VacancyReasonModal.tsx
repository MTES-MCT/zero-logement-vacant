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
  Text,
} from '@dataesr/react-dsfr';
import React, { ChangeEvent, useState } from 'react';
import { vacancyReasonsOptions } from '../../../models/HousingFilters';
import { SelectOption } from '../../../models/SelectOption';

interface Props {
  currentVacancyReasons?: string[];
  onClose: () => void;
  onSubmit: (vacancyReasons: string[]) => void;
}

const VacancyReasonsModal = ({
  currentVacancyReasons,
  onClose,
  onSubmit,
}: Props) => {
  const [vacancyReasons, setVacancyReasons] = useState<string[]>(
    currentVacancyReasons ?? []
  );

  const OptionCheckboxes = (
    vacancyReasonOptions: {
      subHeader: string;
      options: SelectOption[];
    }[]
  ) => {
    return vacancyReasonOptions.map(({ subHeader, options }, index) => (
      <div key={`vacancy_reason_sub_header_${index}`} className="fr-mb-3w">
        <Text as="span" bold size="md">
          {subHeader}
        </Text>
        <hr className="fr-pb-1w" />
        {options.map((option) => (
          <Checkbox
            key={`vacancy_reason_${option.value}`}
            label={option.label}
            checked={vacancyReasons?.includes(option.value)}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setVacancyReasons([
                ...vacancyReasons.filter((_) => _ !== option.value),
                ...(e.target.checked ? [option.value] : []),
              ])
            }
          />
        ))}
      </div>
    ));
  };

  return (
    <div>
      <Modal isOpen hide={onClose} size="lg">
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
                {OptionCheckboxes(vacancyReasonsOptions.slice(0, 3))}
              </Col>
              <Col n="6">
                {OptionCheckboxes(vacancyReasonsOptions.slice(3))}
              </Col>
            </Row>
          </Container>
        </ModalContent>
        <ModalFooter>
          <Button secondary className="fr-mr-2w" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => onSubmit(vacancyReasons)}>Valider</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default VacancyReasonsModal;
