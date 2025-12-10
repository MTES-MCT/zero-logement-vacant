import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Tag from '@codegouvfr/react-dsfr/Tag';
import type { TaxKind } from '@zerologementvacant/models';
import { type ChangeEvent, useMemo, useState } from 'react';
import * as yup from 'yup';

import { useForm } from '../../../hooks/useForm';
import { useUser } from '../../../hooks/useUser';
import { type Locality, TaxKindLabels } from '../../../models/Locality';
import AppCheckbox from '../../_app/AppCheckbox/AppCheckbox';
import AppHelp from '../../_app/AppHelp/AppHelp';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { Col, Container, Row } from '../../_dsfr';

interface Props {
  locality: Locality;
  onSubmit: (geoCode: string, taxKind: TaxKind, taxRate?: number) => void;
}

const LocalityTaxEditionModal = ({ locality, onSubmit }: Props) => {
  const modal = useMemo(
    () =>
      createModal({
        id: `locality-tax-edition-modal-${locality?.geoCode}`,
        isOpenedByDefault: false
      }),
    [locality]
  );

  const { isVisitor } = useUser();

  const [hasTHLV, setHasTHLV] = useState(locality.taxKind === 'THLV');
  const [taxRate, setTaxRate] = useState(String(locality.taxRate ?? ''));

  const shape = {
    taxRate: hasTHLV
      ? yup.number().typeError('Veuillez saisir un taux valide')
      : yup.string().nullable()
  };

  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape) as any, {
    taxRate
  });

  const submitContactPointForm = async () => {
    await form.validate(() => {
      if (hasTHLV && taxRate) {
        onSubmit(locality.geoCode, 'THLV', Number(taxRate));
      } else {
        onSubmit(locality.geoCode, 'None');
      }
    });
  };

  return (
    <>
      {!isVisitor && (
        <Button
          iconId="fr-icon-edit-fill"
          onClick={modal.open}
          title="Modifier"
          priority="tertiary no outline"
          className="d-inline-block"
        />
      )}
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
            priority: 'secondary'
          },
          {
            children: 'Enregistrer',
            onClick: submitContactPointForm,
            doClosesModal: false
          }
        ]}
        style={{
          textAlign: 'initial',
          fontWeight: 'initial',
          fontSize: 'initial'
        }}
      >
        <Container as="section" fluid>
          <Tag>{TaxKindLabels[hasTHLV ? 'THLV' : 'None']}</Tag>
          <form id="user_form">
            <Row spacing="mt-2w">
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
              <AppHelp>
                La taxe d’habitation sur les logements vacants (THLV) peut être
                instaurée dans toutes les communes où la TLV n’est pas
                appliquée.
              </AppHelp>
            )}
          </form>
        </Container>
      </modal.Component>
    </>
  );
};

export default LocalityTaxEditionModal;
