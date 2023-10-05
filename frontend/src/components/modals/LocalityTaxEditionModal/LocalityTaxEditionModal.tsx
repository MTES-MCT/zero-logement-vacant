import React, { ChangeEvent, useState } from 'react';
import { Col, Container, Row } from '../../../components/dsfr/index';

import * as yup from 'yup';
import { useForm } from '../../../hooks/useForm';
import { Locality, TaxKinds, TaxKindsLabels } from '../../../models/Locality';
import Help from '../../Help/Help';
import AppTextInput from '../../AppTextInput/AppTextInput';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Tag from '@codegouvfr/react-dsfr/Tag';
import AppCheckbox from '../../AppCheckbox/AppCheckbox';

const modal = createModal({
  id: 'locality-tax-edition-modal',
  isOpenedByDefault: true,
});

interface Props {
  locality: Locality;
  onSubmit: (xKind: TaxKinds, taxRate?: number) => void;
}

const LocalityTaxEditionModal = ({ locality, onSubmit }: Props) => {
  const [hasTHLV, setHasTHLV] = useState(locality.taxKind === TaxKinds.THLV);
  const [taxRate, setTaxRate] = useState(String(locality.taxRate ?? ''));

  const shape = {
    taxRate: hasTHLV
      ? yup.number().typeError('Veuillez saisir un taux valide')
      : yup.string().nullable(),
  };

  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    taxRate,
  });

  const submitContactPointForm = async () => {
    await form.validate(() => {
      if (hasTHLV && taxRate) {
        onSubmit(TaxKinds.THLV, Number(taxRate));
      } else {
        onSubmit(TaxKinds.None);
      }
    });
  };

  return (
    <modal.Component
      title={
        <>
          <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
          Taxe à {locality.name}
        </>
      }
      buttons={[
        {
          children: 'Annuler',
          priority: 'secondary',
        },
        {
          children: 'Enregistrer',
          onClick: submitContactPointForm,
          doClosesModal: false,
        },
      ]}
    >
      <Container as="section" fluid>
        <Tag>{TaxKindsLabels[hasTHLV ? TaxKinds.THLV : TaxKinds.None]}</Tag>
        <form id="user_form">
          <Row spacing="my-2w">
            <Col>
              <AppCheckbox
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setHasTHLV(e.target.checked)
                }
                checked={hasTHLV}
                label="Cette commune est soumise à la THLV (Taxe d'habitation sur les logements vacants)"
              />
            </Col>
          </Row>
          {hasTHLV ? (
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  inputForm={form}
                  inputKey="taxRate"
                  label="Taux après 2 ans"
                />
              </Col>
            </Row>
          ) : (
            <Help>
              La taxe d’habitation sur les logements vacants (THLV) peut être
              instaurée dans toutes les communes où la TLV n’est pas appliquée.
            </Help>
          )}
        </form>
      </Container>
    </modal.Component>
  );
};

export default LocalityTaxEditionModal;
