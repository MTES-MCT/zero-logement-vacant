import {
  Button,
  Checkbox,
  Col,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  Row,
  Tabs,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React, { ChangeEvent, useState } from 'react';
import {
  BlockingPointOptions,
  OptionTreeSeparator,
  SupportOptions,
} from '../../../models/HousingFilters';
import { OptionTreeElement } from '../../../models/SelectOption';
import Tab from '../../Tab/Tab';

interface Props {
  currentPrecisions: string[];
  currentVacancyReasons: string[];
  onClose: () => void;
  onSubmit: (precisions: string[], vacancyReasons: string[]) => void;
}

const PrecisionsModal = ({
  currentPrecisions,
  currentVacancyReasons,
  onClose,
  onSubmit,
}: Props) => {
  const [precisions, setPrecisions] = useState<string[]>(currentPrecisions);
  const [vacancyReasons, setVacancyReasons] = useState<string[]>(
    currentVacancyReasons
  );

  return (
    <div>
      <Modal isOpen hide={onClose} size="lg">
        <ModalClose hide={onClose} title="Fermer la fenêtre">
          Fermer
        </ModalClose>
        <ModalContent>
          <Container as="section" fluid>
            <Tabs className="no-border">
              <Tab label={`Dispositifs (${precisions.length})`}>
                <OptionsTreeCheckboxes
                  options={SupportOptions}
                  values={precisions}
                  onChange={setPrecisions}
                />
              </Tab>
              <Tab label={`Points de blocage (${vacancyReasons.length})`}>
                <OptionsTreeCheckboxes
                  options={BlockingPointOptions}
                  values={vacancyReasons}
                  onChange={setVacancyReasons}
                />
              </Tab>
            </Tabs>
          </Container>
        </ModalContent>
        <ModalFooter>
          <Button secondary className="fr-mr-2w" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => onSubmit(precisions, vacancyReasons)}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

interface OptionsTreeCheckboxesProp {
  options: OptionTreeElement[];
  values: string[];
  onChange: (values: string[]) => void;
}

const OptionsTreeCheckboxes = ({
  options,
  values,
  onChange,
}: OptionsTreeCheckboxesProp) => {
  const getValue = (...elements: (OptionTreeElement | string)[]) =>
    elements
      .map((element) => (typeof element === 'string' ? element : element.title))
      .join(OptionTreeSeparator);

  const onCheckOption = (e: ChangeEvent<HTMLInputElement>, value: string) => {
    onChange([
      ...values.filter((_) => _ !== value),
      ...(e.target.checked ? [value] : []),
    ]);
  };

  return (
    <>
      {options.map((option, index) => (
        <div key={`option_${index}`} className="fr-pb-4w">
          <Title as="h2" look="h4">
            <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
            {option.title}
            <span className="fr-text--md">
               (Cochez une ou plusieurs précisions)
            </span>
          </Title>
          <Row gutters>
            {option.elements.map((element1, index1) => (
              <Col
                n={option.title === 'Mode opératoire' ? '4' : '6'}
                key={`option_${index}_${index1}`}
              >
                <Text as="span" bold size="md">
                  {(element1 as OptionTreeElement).title}
                </Text>
                <hr className="fr-pb-1w" />
                {(element1 as OptionTreeElement).elements.map(
                  (element2, index2) => (
                    <Checkbox
                      key={`option_${index}_${index1}_${index2}`}
                      label={element2 as string}
                      checked={values.includes(
                        getValue(
                          option,
                          element1 as OptionTreeElement,
                          element2
                        )
                      )}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onCheckOption(
                          e,
                          getValue(
                            option,
                            element1 as OptionTreeElement,
                            element2
                          )
                        )
                      }
                    />
                  )
                )}
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </>
  );
};

export default PrecisionsModal;
