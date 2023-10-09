import { Col, Container, Row, Text, Title } from '../../_dsfr';
import React, { ChangeEvent, useState } from 'react';
import {
  BlockingPointOptions,
  OptionTreeSeparator,
  SupportOptions,
} from '../../../models/HousingFilters';
import { OptionTreeElement } from '../../../models/SelectOption';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import AppCheckbox from '../../_app/AppCheckbox/AppCheckbox';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import AppLinkAsButton from '../../_app/AppLinkAsButton/AppLinkAsButton';

const modal = createModal({
  id: 'precisions-modal',
  isOpenedByDefault: true,
});

interface Props {
  currentPrecisions: string[];
  currentVacancyReasons: string[];
  onSubmit: (precisions: string[], vacancyReasons: string[]) => void;
}

const PrecisionsModal = ({
  currentPrecisions,
  currentVacancyReasons,
  onSubmit,
}: Props) => {
  const [precisions, setPrecisions] = useState<string[]>(currentPrecisions);
  const [vacancyReasons, setVacancyReasons] = useState<string[]>(
    currentVacancyReasons
  );

  return (
    <>
      <AppLinkAsButton isSimple onClick={modal.open}>
        Ajouter / Modifier
      </AppLinkAsButton>
      <modal.Component
        size="large"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
          },
          {
            children: 'Enregistrer',
            onClick: () => onSubmit(precisions, vacancyReasons),
          },
        ]}
        title=""
      >
        <Container as="section" fluid>
          <Tabs
            className="no-border"
            tabs={[
              {
                label: `Dispositifs (${precisions.length})`,
                content: (
                  <OptionsTreeCheckboxes
                    options={SupportOptions}
                    values={precisions}
                    onChange={setPrecisions}
                  />
                ),
              },
              {
                label: `Points de blocage (${vacancyReasons.length})`,
                content: (
                  <OptionsTreeCheckboxes
                    options={BlockingPointOptions}
                    values={vacancyReasons}
                    onChange={setVacancyReasons}
                  />
                ),
              },
            ]}
          />
        </Container>
      </modal.Component>
    </>
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
            <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
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
                    <AppCheckbox
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
